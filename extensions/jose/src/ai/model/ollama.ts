import { GetApiOllama } from "../../type/config";
import { TalkType } from "../../type/talk";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ReadableStream } from "node:stream/web";
// @ts-expect-error ignore
globalThis.ReadableStream = ReadableStream;

export const CallOllama = async (
  chat: TalkType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  config: { stream: boolean; temperature: string; model: string; modelCompany: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: { model: any[]; invoke: any[] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const c = new ChatOllama({
    baseUrl: GetApiOllama().host,
    model: "llama3",
    temperature: parseFloat(config.temperature),
    // callbacks: callbacks.model,
  });

  // console.log("b")
  // const stream = await c
  // .pipe(new StringOutputParser())
  // .stream(`Translate "I love programming" into German.`);

  // const chunks = [];
  // for await (const chunk of stream) {
  //   chunks.push(chunk);
  // }

  // console.log(chunks.join(""));

  // console.log("cc")

  await c.invoke(messages, { callbacks: callbacks.invoke });
  // const res = await c.invoke(messages);

  // console.log(res)

  return chat;
};
