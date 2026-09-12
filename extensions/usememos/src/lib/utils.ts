import { Memo } from "./types";
import { getPreferenceValues, Cache } from "@raycast/api";
import { OpenAI } from "openai";
import crypto from "crypto";

const cache = new Cache();

function getContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function getSummaryStream(memo: Memo) {
  const { openAiApiKey, openAiBasePath, model, language } = getPreferenceValues<ExtensionPreferences>();
  const contentHash = getContentHash(memo.content);
  const cachedSummary = cache.get(`summary-${contentHash}`);

  if (cachedSummary) {
    return (async function* () {
      yield cachedSummary;
    })();
  }

  if (!openAiApiKey) {
    return (async function* () {
      yield memo.content;
    })();
  }

  const openai = new OpenAI({
    apiKey: openAiApiKey,
    baseURL: openAiBasePath,
  });

  const stream = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that summarizes the given content as a concise title. Your must use ${language}!!`,
      },
      { role: "user", content: memo.content },
    ],
    stream: true,
  });

  return (async function* () {
    let content = "";
    for await (const chunk of stream) {
      content += chunk.choices[0]?.delta?.content || "";
      yield content;
    }
    if (content) {
      cache.set(`summary-${contentHash}`, content);
    }
  })();
}
