import type { AI } from "@raycast/api";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

export const META_BASE_URL = "https://api.meta.ai/v1";

function toRegisteredModel(m: { id: string; owned_by?: string }): AI.RegisteredModel {
  const version = m.id.replace(/^muse-spark-/, "Spark ");
  return {
    id: m.id,
    title: `Muse ${version}`,
    icon: "extension-icon.png",
    description: m.owned_by ? `Owned by ${m.owned_by}` : undefined,
    contextWindow: 1_048_576,
    capabilities: {
      systemMessage: { supported: true },
      streaming: { supported: true },
      temperature: { supported: true },
      tools: { supported: true },
      vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] },
    },
  };
}

const modelsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      // GET /v1/models returns at least { id, object, created, owned_by }
      created: z.number().optional(),
      owned_by: z.string().optional(),
    }),
  ),
});

export function createMetaClient(apiKey: string, fetcher: typeof fetch = fetch) {
  return createOpenAI({ apiKey, baseURL: META_BASE_URL, fetch: fetcher });
}

export function createModelProvider(options: { apiKey: string; fetch?: typeof fetch }) {
  const fetcher = options.fetch ?? fetch;
  const client = createMetaClient(options.apiKey, fetcher);

  const getModels: AI.GetModels = async () => {
    const response = await fetcher(`${META_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${options.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("Model discovery was denied. Check your Model API key in extension preferences.");
    }
    if (!response.ok) {
      throw new Error(`Could not fetch models (HTTP ${response.status}). Try refreshing models again.`);
    }
    const catalog = modelsResponseSchema.parse(await response.json());
    const spark = catalog.data.filter((m) => m.id.startsWith("muse-spark"));
    if (spark.length === 0) {
      throw new Error("No Muse Spark models returned by the Model API. Try refreshing models again.");
    }
    return spark.map(toRegisteredModel);
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
      maxRetries: 0,
    });
    // Meta rejects tool names longer than 64 chars, so over-long names were
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
 * `name` Meta sees fits its 64-char limit.
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

/** Meta's API allows at most 64 chars per tool name; shorten deterministically. */
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
