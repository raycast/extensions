import { GetApiOpenAi } from "../../type/config";
import { TalkType } from "../../type/talk";
import { ChatOpenAI } from "@langchain/openai";
import fetch from "node-fetch";
// @ts-expect-error ignore
globalThis.fetch = fetch;

export const CallOpenAI = async (
  chat: TalkType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  config: { stream: boolean; temperature: string; model: string; modelCompany: string },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: { model: any[]; invoke: any[] }
): Promise<TalkType> => {
  const c = new ChatOpenAI({
    apiKey: GetApiOpenAi().key,
    modelName: config.model,
    streaming: true,
    temperature: parseFloat(config.temperature),
    callbacks: callbacks.model,
  });

  await c.invoke(messages, { callbacks: callbacks.invoke });

  return chat;
};
