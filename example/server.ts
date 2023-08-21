import "dotenv/config";
import { Midjourney } from "../src";
import { createClient } from 'redis';
import express, { Express, Request, Response } from 'express';
import { json } from 'body-parser';
import Bull, {Job} from 'bull';
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from 'swagger-jsdoc';

const url = 'redis://localhost:6379';

const taskQueue = new Bull("task",{
    redis: url
});

const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Express API',
        version: '1.0.0',
        description: 'Express API with Swagger'
      },
      servers: [{
        url: 'http://localhost:3000'
      }]
    },
    // Path to the API docs
    apis: ['/Users/udhaykumar/development/midjourney-api/example/server.ts']
  };
  
  const swaggerDocs = swaggerJsDoc(swaggerOptions);



// connect to redis


const app: Express = express();
app.use(json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


const port: number = 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World').status(200);
});

/**
 * @swagger
 * /imagine:
 *   post:
 *     description: Add Imagine Task
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: inputMsg
 *         description: Message for imagine task.
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Task added successfully
 */
app.post('/imagine', async (req: Request, res: Response) => {
    const { inputMsg } = req.body;
    const id = generateID();
    console.log("🔥🔥🔥 ",inputMsg,req.body,req);
    const msg = await taskQueue.add({taskType:'imagine',id,inputMsg});
    setData(id, "", "0%");
    res.json({ 
        "taskId":id 
    }).status(200);
});

/**
 * @swagger
 * /imagine/{id}:
 *  get:
 *    summary: "Get Imagine Task by ID"
 *    parameters:
 *      - name: "id"
 *        in: "path"
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: "Task Details"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                taskId:
 *                  type: string
 *                uri:
 *                  type: string
 *                progress:
 *                  type: string
 */
app.get('/imagine/:id', async (req: Request, res: Response) => {
    const redisClient = createClient({
        url
    });
    
    await redisClient.connect();
    const { id } = req.params;
    const msg = await redisClient.hGetAll(id);
    res.json({ 
        "taskId":id,
        "uri":msg.uri,
        "progress":msg.progress
    });
});

/**
 * @swagger
 * /reroll:
 *  post:
 *    summary: "Re-roll Task"
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              id:
 *                type: string
 *            required:
 *              - id
 *    responses:
 *      200:
 *        description: "Task Re-rolled"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                taskId:
 *                  type: string
 */
app.post('/reroll', async (req: Request, res: Response) => {
    const { id } = req.body;
    const data = await getDataAll(id);
    if (data.imagineId == undefined) {
        res.json({ 
            "error":"Id is not found",
        });
        return;
    }
    if(id.split("_").length == 2){
        res.json({ 
            "error":"upscale id will only work with custom task",
        });
        return;
    }

    const newId = generateID();
    const reroll = taskQueue.add({taskType:'reroll', id:newId, imagineId:data.imagineId, hash:data.hash, flags:data.flags});
    setData(newId, "", "0%");
    res.json({ 
        "taskId":newId,
    });
});

/**
 * @swagger
 * /variation:
 *  post:
 *    summary: "Add Variation Task"
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              id:
 *                type: string
 *              index:
 *                type: integer
 *            required:
 *              - id
 *              - index
 *    responses:
 *      200:
 *        description: "Task Variation Added"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                taskId:
 *                  type: string
 */
app.post('/variation', async (req: Request, res: Response) => {
    const { id, index } = req.body;
    const data = await getDataAll(id);
    if (data.imagineId == undefined) {
        res.json({ 
            "error":"Id is not found",
        });
        return;
    }
    if(id.split("_").length == 2){
        res.json({ 
            "error":"upscale id will only work with custom task",
        });
        return;
    }

    const newId = generateID();
    const variation = taskQueue.add({taskType:'variation', id:newId, index:index, imagineId:data.imagineId, hash:data.hash, flags:data.flags});
    setData(newId, "", "0%");
    res.json({ 
        "taskId":newId,
    });
});

/**
 * @swagger
 * /upscale:
 *  post:
 *    summary: "Add Upscale Task"
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              id:
 *                type: string
 *              index:
 *                type: integer
 *            required:
 *              - id
 *              - index
 *    responses:
 *      200:
 *        description: "Upscale Task Added"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                taskId:
 *                  type: string
 */
app.post('/upscale', async (req: Request, res: Response) => {
    const { id, index } = req.body;
    const data = await getDataAll(id);
    if (data.imagineId == undefined) {
        res.json({ 
            "error":"Id is not found",
        });
        return;
    }
    if(id.split("_").length == 2){
        res.json({ 
            "error":"upscale id will only work with custom task",
        });
        return;
    }
    const newId = "us_" + generateID();

    const upscale = taskQueue.add({taskType:'upscale', id:newId, index:index, imagineId:data.imagineId, hash:data.hash, flags:data.flags});
    setData(newId, "", "0%");
    res.json({ 
        "taskId":newId,
    });
});

/**
 * @swagger
 * /custom:
 *    post:
 *    summary: "Add Custom Task"
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              id:
 *                type: string
 *              level:
 *                type: string
 *            required:
 *              - id
 *              - level
 *    responses:
 *      200:
 *        description: "Custom Task Added"
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                taskId:
 *                  type: string
 */
app.post('/custom', async (req: Request, res: Response) => {
    const { id, level } = req.body;
    const data = await getDataAll(id);
    if (data.imagineId == undefined) {
        res.json({ 
            "error":"Id is not found",
        });
        return;
    }
    if(id.split("_").length != 2){
        res.json({ 
            "error":"You can only use custom task with upscale id",
        });
        return;
    }
    const newId = generateID();
    const custom = taskQueue.add({taskType:'custom', id:newId, imagineId:data.imagineId, hash:data.hash, flags:data.flags, level:level});
    setData(newId, "", "0%");
    res.json({ 
        "taskId":newId,
    });
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/api-docs`);
});

const processTaskQueue = async (job: Job) => {
    let result: any;
    if (job.data.taskType == "imagine") {
        const { _, id, inputMsg } = job.data;
        result = await imagine(id, inputMsg).then((msg) => {
            if (msg != null) {
                setAllData(id, msg.uri, "100%", msg.id, msg.hash, msg.flags);
            }
        });
    } else if (job.data.taskType == "reroll") {
        const { _, id, imagineId, hash, flags } = job.data;
        result = await reroll(id, imagineId, hash, flags).then((msg) => {
            if (msg != null) {
                setAllData(id, msg.uri, "100%", msg.id, msg.hash, msg.flags);
            }
        });
    } else if (job.data.taskType == "variation") {
        const { _, id, index, imagineId, hash, flags } = job.data;
        result = await variation(id, index, imagineId, hash, flags).then((msg) => {
            if (msg != null) {
                setAllData(id, msg.uri, "100%", msg.id, msg.hash, msg.flags);
            }
        });

    }else if (job.data.taskType == "upscale") {
        const { _, id, index, imagineId, hash, flags } = job.data;
        result = await upscale(id, index, imagineId, hash, flags).then((msg) => {
            if (msg != null) {
                setAllData(id, msg.uri, "100%", msg.id, msg.hash, msg.flags);
            }
        });
    }else if (job.data.taskType == "custom") {
        const { _, id, imagineId, hash, flags, level } = job.data;
        result = await zoomOut(id, level, imagineId, hash, flags).then((msg) => {
            if (msg != null) {
                setAllData(id, msg.uri, "100%", msg.id, msg.hash, msg.flags);
            }
        });
    }
    return result;
}

taskQueue.process(processTaskQueue);

async function imagine(taskId: string, inputMsg: string) {
    const client = new Midjourney({
      ServerId: <string>process.env.SERVER_ID,
      ChannelId: <string>process.env.CHANNEL_ID,
      SalaiToken: <string>process.env.SALAI_TOKEN,
      Debug: false,
      Ws: false,
    });

    const msg = await client.Imagine(
        inputMsg,
      (uri: string, progress: string) => {
        setData(taskId, uri, progress);
        console.log("loading", uri, "progress", progress);
    }
    ).catch((err) => {
        console.error(err);
    });
    
    return msg;
}

async function reroll(taskId: string, id: string, hash: string, flags: string) {
    const client = new Midjourney({
        ServerId: <string>process.env.SERVER_ID,
        ChannelId: <string>process.env.CHANNEL_ID,
        SalaiToken: <string>process.env.SALAI_TOKEN,
        Debug: false,
    });

    await client.Connect();

    const msg = await client.Reroll({
        msgId: id,
        hash: hash,
        flags: Number(flags),
        loading: (uri: string, progress: string) => {
            console.log("loading", uri, "progress", progress);
            setData(taskId, uri, progress);
        }
    });

    return msg;
}

async function variation(taskId: string, index: string, id: string, hash: string, flags: string) {
    const client = new Midjourney({
        ServerId: <string>process.env.SERVER_ID,
        ChannelId: <string>process.env.CHANNEL_ID,
        SalaiToken: <string>process.env.SALAI_TOKEN,
        Debug: false,
    });

    const msg = await client.Variation({
        index: <1|2|3|4>Number(index),
        msgId: id,
        hash: hash,
        flags: Number(flags),
        loading: (uri: string, progress: string) => {
            setData(taskId, uri, progress);
        }
    });


    return msg;
}

async function upscale(taskId: string, index: string, id: string, hash: string, flags: string) {
    const client = new Midjourney({
        ServerId: <string>process.env.SERVER_ID,
        ChannelId: <string>process.env.CHANNEL_ID,
        SalaiToken: <string>process.env.SALAI_TOKEN,
        Debug: false,
    });

    const msg = await client.Upscale({
        index: <1|2|3|4>Number(index),
        msgId: id,
        hash: hash,
        flags: Number(flags),
        loading: (uri: string, progress: string) => {
            setData(taskId, uri, progress);
        }
    });

    return msg;
}

async function zoomOut(taskId: string, level: string, id: string, hash: string, flags: string) {
    const client = new Midjourney({
        ServerId: <string>process.env.SERVER_ID,
        ChannelId: <string>process.env.CHANNEL_ID,
        SalaiToken: <string>process.env.SALAI_TOKEN,
        Debug: false,
    });

    const msg = await client.ZoomOut({
        level: <"high" | "low" | "2x" | "1.5x">level,
        msgId: id,
        hash: hash,
        flags: Number(flags),
        loading: (uri: string, progress: string) => {
            setData(taskId, uri, progress);
        }
    });

    return msg;
}

async function setData(taskId: string, uri: string, progress: string) {
    const redisClient = createClient({
        url
    });
    
    await redisClient.connect();
    redisClient.hSet(taskId, "uri", uri);
    redisClient.hSet(taskId, "progress", progress);
}

async function setAllData(taskId: string, uri: string, progress: string, imagineId: string|undefined, hash: string|undefined, flags: number|undefined) {
    const redisClient = createClient({
        url
    });
    
    await redisClient.connect();
    redisClient.hSet(taskId, "uri", uri);
    redisClient.hSet(taskId, "progress", progress);
    redisClient.hSet(taskId, "imagineId", imagineId ?? "");
    redisClient.hSet(taskId, "hash", hash ?? "");
    redisClient.hSet(taskId, "flags", flags ?? "");
}

async function getDataAll(taskId: string) {
    const redisClient = createClient({
        url
    });
    
    await redisClient.connect();
    const msg = await redisClient.hGetAll(taskId);
    return msg;
}

//generate a random id with Hexadecimal of length 10
function generateID() {
    return Math.random().toString(16).substr(2, 10);
}
