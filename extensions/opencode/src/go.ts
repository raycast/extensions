import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// OpenCode Go is a subscription on the same API key, served from its own endpoint.
const GO_URL = "https://opencode.ai/zen/go/v1";
// Go asks clients to identify themselves instead of sending the generic SDK user agent.
const HEADERS = { "User-Agent": "raycast-opencode" };

const Models = z.object({ data: z.array(z.object({ id: z.string().min(1) })) });

export async function loadGoModels(apiKey: string) {
  const response = await fetch(`${GO_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403)
    throw new Error("OpenCode Go rejected the API key. Check your Go subscription or uncheck Go Models.");
  if (!response.ok) throw new Error(`Could not load OpenCode Go models (HTTP ${response.status}).`);
  return Models.parse(await response.json()).data.map((model) => model.id);
}

// Go serves each family on its native API, like the managed catalog, but doesn't say which, so match by name.
export function goLanguageModel(modelID: string, apiKey: string) {
  const options = { baseURL: GO_URL, apiKey, headers: HEADERS };
  if (/^(minimax|qwen)/.test(modelID)) return createAnthropic(options)(modelID);
  if (/^(gpt|grok|muse)-/.test(modelID)) return createOpenAI(options).responses(modelID);
  return createOpenAI(options).chat(modelID);
}

// Go requires a stable session per conversation. Raycast doesn't expose a conversation ID,
// but every request replays the history, so hash the first message.
export function goSessionHeaders(messages: readonly unknown[]) {
  return { "x-opencode-session": `raycast-${hash(JSON.stringify(messages[0] ?? "")).toString(16)}` };
}

export function hash(value: string) {
  let result = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}
