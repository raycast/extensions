import type { AI } from "@raycast/api";
import { jsonSchema, streamText, tool, type LanguageModel, type ToolSet } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// SDK warnings (e.g. a setting a model ignores) are noise in the Raycast console.
globalThis.AI_SDK_LOG_WARNINGS = false;

export const ZEN_BASE_URL = "https://opencode.ai/zen/v1";
export const GO_BASE_URL = "https://opencode.ai/zen/go/v1";
// Zen and Go share model ids, so Go models are registered as `go/<id>`.
const GO_PREFIX = "go/";

// ponytail: vision/temperature guessed by model family; read models.dev if a family gets it wrong.
const FREE_MODEL = /-free$|^big-pickle$/;
const VISION_FAMILIES = /^(claude|gemini|gpt|grok|muse)-/;

function toRegisteredModel(id: string, go: boolean): AI.RegisteredModel {
  return {
    id: go ? GO_PREFIX + id : id,
    title: go ? `${id} (Go)` : id,
    icon: "extension-icon.png",
    contextWindow: 200_000,
    capabilities: {
      systemMessage: { supported: true },
      streaming: { supported: true },
      // GPT-5+ reasoning models reject temperature.
      temperature: { supported: !id.startsWith("gpt-") },
      tools: { supported: true },
      ...(VISION_FAMILIES.test(id) && { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } }),
    },
  };
}

const modelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
});

function createProviders(apiKey: string, baseURL: string, fetcher: typeof fetch) {
  // Go asks clients to identify themselves instead of sending the generic SDK user agent.
  const headers = { "User-Agent": "raycast-opencode-ai" };
  const options = { apiKey, baseURL, fetch: fetcher, headers };
  return {
    openai: createOpenAI(options),
    anthropic: createAnthropic(options),
    google: createGoogleGenerativeAI({ ...options, headers: { ...headers, Authorization: `Bearer ${apiKey}` } }),
  };
}

/** Zen and Go serve each model family on its native API, so route to the matching AI SDK provider. */
export function createZenClient(apiKey: string, fetcher: typeof fetch = fetch) {
  const zen = createProviders(apiKey, ZEN_BASE_URL, fetcher);
  const go = createProviders(apiKey, GO_BASE_URL, fetcher);
  return (id: string): LanguageModel => {
    if (id.startsWith(GO_PREFIX)) {
      const goId = id.slice(GO_PREFIX.length);
      if (/^(minimax|qwen)/.test(goId)) return go.anthropic(goId);
      if (/^(gpt|grok|muse)-/.test(goId)) return go.openai.responses(goId);
      return go.openai.chat(goId);
    }
    if (/^(claude|qwen)/.test(id)) return zen.anthropic(id);
    if (id.startsWith("gemini-")) return zen.google(id);
    if (/^(gpt|grok|muse)-/.test(id)) return zen.openai.responses(id);
    return zen.openai.chat(id);
  };
}

/**
 * Go requires a stable `x-opencode-session` per conversation. Raycast doesn't expose a
 * conversation id, but every request replays the history, so hash the first message.
 */
export function sessionHeaders(messages: readonly unknown[]): Record<string, string> {
  const seed = JSON.stringify(messages[0] ?? "");
  return { "x-opencode-session": `raycast-${hashString(seed).toString(16)}` };
}

export function createModelProvider(options: {
  apiKey: string;
  includeZen?: boolean;
  includeGo?: boolean;
  fetch?: typeof fetch;
}) {
  const fetcher = options.fetch ?? fetch;
  const client = createZenClient(options.apiKey, fetcher);

  // Sending the key makes Zen return only the models enabled for this account.
  async function fetchModelIds(baseURL: string): Promise<string[]> {
    const response = await fetcher(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${options.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("Model discovery was denied. Check your OpenCode API key in extension preferences.");
    }
    if (!response.ok) {
      throw new Error(`Could not fetch models (HTTP ${response.status}). Try refreshing models again.`);
    }
    // Zen rejects free-tier models outside the OpenCode app (403 FreeTierError).
    return modelsResponseSchema
      .parse(await response.json())
      .data.map((m) => m.id)
      .filter((id) => !FREE_MODEL.test(id));
  }

  const getModels: AI.GetModels = async () => {
    const [zen, go] = await Promise.all([
      options.includeZen ? fetchModelIds(ZEN_BASE_URL) : [],
      options.includeGo ? fetchModelIds(GO_BASE_URL) : [],
    ]);
    const models = [...zen.map((id) => toRegisteredModel(id, false)), ...go.map((id) => toRegisteredModel(id, true))];
    if (models.length === 0) {
      throw new Error("No OpenCode models available. Enable Zen or Go models in extension preferences.");
    }
    return models;
  };

  const streamCompletion: AI.StreamCompletion = (model, request) => {
    const { toolSet, restoreName, shortenName } = toAiTools(request.tools);
    const result = streamText({
      model: client(model.id),
      system: request.system,
      messages: mapMessageToolNames(request.messages ?? [], shortenName),
      temperature: model.capabilities?.temperature?.supported ? request.temperature : undefined,
      tools: toolSet,
      toolChoice: request.toolChoice,
      headers: sessionHeaders(request.messages ?? []),
      maxRetries: 0,
    });
    // Providers reject tool names longer than 64 chars, so over-long names were
    // shortened above. Map them back so Raycast executes the original tools.
    if (restoreName.size === 0) return result;
    return {
      fullStream: (async function* () {
        for await (const part of result.fullStream) {
          yield restorePartToolName(part, restoreName) as AI.ModelStreamPart;
        }
      })(),
    };
  };

  return { getModels, streamCompletion };
}

const MAX_TOOL_NAME_LENGTH = 64;

function restoreToolName<T>(value: T, restoreName: Map<string, string>): T {
  const name = (value as { toolName?: unknown } | null)?.toolName;
  if (typeof name !== "string" || !restoreName.has(name)) return value;
  return { ...value, toolName: restoreName.get(name) };
}

// tool-approval-request parts nest the call under `toolCall`.
function restorePartToolName(part: unknown, restoreName: Map<string, string>): unknown {
  const restored = restoreToolName(part, restoreName) as { toolCall?: unknown };
  if (typeof restored !== "object" || restored === null || !("toolCall" in restored)) return restored;
  return { ...restored, toolCall: restoreToolName(restored.toolCall, restoreName) };
}

function toAiTools(tools: AI.ModelToolSet | undefined): {
  toolSet: ToolSet | undefined;
  restoreName: Map<string, string>;
  shortenName: Map<string, string>;
} {
  const restoreName = new Map<string, string>();
  const shortenName = new Map<string, string>();
  if (!tools || Object.keys(tools).length === 0) return { toolSet: undefined, restoreName, shortenName };
  // Raycast executes tools and supplies their results on the next request.
  const used = new Set<string>();
  const entries = Object.entries(tools).map(([name, definition]) => {
    const safeName = shortenToolName(name, used);
    if (safeName !== name) {
      restoreName.set(safeName, name);
      shortenName.set(name, safeName);
    }
    return [
      safeName,
      tool({
        description: definition.description,
        inputSchema: jsonSchema(
          (definition.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
        ),
      }),
    ] as const;
  });
  return { toolSet: Object.fromEntries(entries), restoreName, shortenName };
}

/**
 * Follow-up requests replay prior assistant `tool-call` parts (with the
 * original long names) inside the message history, and the SDK forwards those
 * as `function_call.name`. Rewrite them to the shortened names so every
 * `name` the provider sees fits its 64-char limit.
 */
function mapMessageToolNames<T extends { content?: unknown } | string | null | undefined>(
  messages: readonly T[],
  shortenName: Map<string, string>,
): T[] {
  if (shortenName.size === 0) return messages as T[];
  return messages.map((message) => {
    if (typeof message !== "object" || message === null) return message;
    const content = (message as { content?: unknown }).content;
    if (!Array.isArray(content)) return message;
    let changed = false;
    const next = content.map((part) => {
      if (typeof part === "object" && part !== null && "toolName" in part) {
        const p = part as { toolName?: unknown };
        if (typeof p.toolName === "string" && shortenName.has(p.toolName)) {
          changed = true;
          return { ...p, toolName: shortenName.get(p.toolName) };
        }
      }
      return part;
    });
    return changed ? { ...message, content: next } : message;
  });
}

/** OpenAI/Anthropic APIs allow at most 64 chars per tool name; shorten deterministically. */
function shortenToolName(name: string, used: Set<string>): string {
  if (name.length <= MAX_TOOL_NAME_LENGTH && !used.has(name)) {
    used.add(name);
    return name;
  }
  let suffix = 0;
  let candidate = "";
  do {
    const hash = hashString(`${name}#${suffix}`).toString(16).padStart(8, "0").slice(0, 8);
    candidate = `${name.slice(0, MAX_TOOL_NAME_LENGTH - 9)}_${hash}`;
    suffix += 1;
  } while (used.has(candidate));
  used.add(candidate);
  return candidate;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
