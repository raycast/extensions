import OpenAI from "openai";
import { getPreference } from "./preference";

function getClient() {
  const { url, apiKey } = getPreference();
  const client = new OpenAI({
    baseURL: url,
    apiKey: apiKey,
  });
  return client;
}

export async function fixSpelling(text: string): Promise<string> {
  const { model } = getPreference();
  const client = getClient();
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant. You will receive text, fix the spelling and grammar, and only reply with the corrected text.",
      },
      { role: "user", content: text },
    ],
    max_tokens: 512,
    temperature: 0.6,
    top_p: 0.95,
    presence_penalty: 0,
    stream: false,
  });
  return response.choices[0].message.content ?? "";
}
