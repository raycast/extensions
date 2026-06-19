import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const openaiClients = new Map<string, OpenAI>();
const anthropicClients = new Map<string, Anthropic>();

export function getOpenAIClient(apiKey: string, baseURL?: string): OpenAI {
  const cacheKey = `${apiKey}:${baseURL || "default"}`;

  let client = openaiClients.get(cacheKey);
  if (!client) {
    client = new OpenAI({ apiKey });
    if (baseURL) {
      client.baseURL = baseURL;
    }
    openaiClients.set(cacheKey, client);
  }

  return client;
}

export function getAnthropicClient(apiKey: string): Anthropic {
  let client = anthropicClients.get(apiKey);
  if (!client) {
    client = new Anthropic({ apiKey });
    anthropicClients.set(apiKey, client);
  }

  return client;
}
