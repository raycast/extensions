import { Cache, getPreferenceValues, type AI } from "@raycast/api";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ModelMessage, type ToolSet } from "ai";
import { readFileSync } from "node:fs";
import { loadCapabilities, lookupCapabilities } from "./capabilities";
import { homedir } from "node:os";
import { join } from "node:path";

// Command Code's official Provider API: https://commandcode.ai/docs/provider
export const BASE_URL = "https://api.commandcode.ai/provider/v1";
export const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
const MAX_TOOL_NAME_LENGTH = 64;
// Anthropic requires max_tokens; the SDK's fallback for unknown model IDs is only 4096.
const ANTHROPIC_MAX_OUTPUT_TOKENS = 32_000;

interface ProviderModel {
  id: string;
  name: string;
  context_length?: number;
  supported_endpoints: string[];
}

interface ModelList {
  models: ProviderModel[];
  /** Set when the latest list couldn't be fetched and this is the cached one. */
  staleReason?: string;
}

const cache = new Cache();

export function getApiKey(): string {
  const { COMMANDCODE_API_KEY } = getPreferenceValues<Preferences>();
  if (COMMANDCODE_API_KEY) return COMMANDCODE_API_KEY;
  try {
    const { apiKey } = JSON.parse(readFileSync(join(homedir(), ".commandcode", "auth.json"), "utf8"));
    if (typeof apiKey === "string" && apiKey) return apiKey;
  } catch {
    // fall through
  }
  throw new Error("No Command Code API key. Set one in extension preferences, or run `cmd login`.");
}

function readCachedModels(): ProviderModel[] | undefined {
  const raw = cache.get("models");
  return raw ? (JSON.parse(raw) as ProviderModel[]) : undefined;
}

export async function fetchModels(): Promise<ModelList> {
  try {
    const res = await fetch(`${BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(await errorMessage(res));
    const { data } = (await res.json()) as { data: ProviderModel[] };
    cache.set("models", JSON.stringify(data));
    return { models: data };
  } catch (error) {
    // A stale list beats an empty picker; the next refresh retries.
    const cached = readCachedModels();
    if (cached) return { models: cached, staleReason: error instanceof Error ? error.message : String(error) };
    throw error;
  }
}

export const getModels: AI.GetModels = async () => {
  const [{ models }, capabilities] = await Promise.all([fetchModels(), loadCapabilities()]);
  return models.map((m) => {
    const caps = lookupCapabilities(capabilities, m.id);
    return {
      id: m.id,
      title: m.name,
      icon: "extension-icon.png",
      contextWindow: m.context_length,
      capabilities: {
        systemMessage: { supported: true },
        streaming: { supported: true },
        temperature: { supported: true },
        tools: { supported: true },
        ...(caps?.vision ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] } } : {}),
        ...(caps?.efforts
          ? {
              reasoningEffort: {
                supported: true,
                options: caps.efforts,
                default: ["medium", "high"].find((e) => caps.efforts!.includes(e)) ?? caps.efforts[0],
              },
            }
          : {}),
      },
    };
  });
};

export const streamCompletion: AI.StreamCompletion = (model, request) =>
  generate(model.id, { ...request, reasoningEffort: request.providerOptions?.raycast?.reasoningEffort });

/** Each model lists the endpoints it answers on: Claude only on /messages, the rest on /chat/completions. */
async function languageModel(modelId: string) {
  const apiKey = getApiKey();
  const models = readCachedModels() ?? (await fetchModels()).models;
  const endpoints = models.find((m) => m.id === modelId)?.supported_endpoints ?? [];
  return endpoints.includes("/messages") && !endpoints.includes("/chat/completions")
    ? createAnthropic({ baseURL: BASE_URL, apiKey })(modelId)
    : createOpenAICompatible({ name: "commandcode", baseURL: BASE_URL, apiKey })(modelId);
}

type GenerateRequest = Omit<AI.ModelRequest, "providerOptions"> & { reasoningEffort?: string };

export async function* generate(modelId: string, request: GenerateRequest): AsyncGenerator<AI.ModelStreamPart> {
  const model = await languageModel(modelId);
  const anthropic = model.provider.startsWith("anthropic");
  const effort = request.reasoningEffort;
  const { tools, restoreName } = toTools(request.tools);
  const result = streamText({
    model,
    system: request.system,
    messages: toMessages(request.messages ?? []),
    temperature: request.temperature,
    tools,
    toolChoice: request.toolChoice,
    maxOutputTokens: anthropic ? ANTHROPIC_MAX_OUTPUT_TOKENS : undefined,
    providerOptions: effort
      ? anthropic
        ? { anthropic: { thinking: { type: "adaptive" }, effort } }
        : { commandcode: { reasoningEffort: effort } }
      : undefined,
    maxRetries: 0,
    // Errors are yielded below; skip the SDK's default console logging.
    onError: () => {},
  });
  for await (const part of result.fullStream) {
    if (part.type === "error") {
      yield { type: "error", error: friendlyError(part.error) };
      continue;
    }
    if ("toolName" in part && restoreName.has(part.toolName)) {
      yield { ...part, toolName: restoreName.get(part.toolName)! } as AI.ModelStreamPart;
    } else {
      yield part as AI.ModelStreamPart;
    }
  }
}

function friendlyError(error: unknown): string {
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 401) return "Command Code rejected the API key. Check extension preferences or run `cmd login`.";
  return error instanceof Error ? error.message : String(error);
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const message = JSON.parse(text)?.error?.message;
    if (typeof message === "string") return message;
  } catch {
    // not JSON
  }
  if (res.status === 401) return "Command Code rejected the API key. Check extension preferences or run `cmd login`.";
  return `Command Code request failed (HTTP ${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`;
}

/** Tool names are capped at 64 chars upstream; shorten deterministically and map back. */
function toWireToolName(name: string): string {
  if (name.length <= MAX_TOOL_NAME_LENGTH) return name;
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) hash = Math.imul(hash ^ name.charCodeAt(i), 0x01000193);
  return `${name.slice(0, MAX_TOOL_NAME_LENGTH - 9)}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function toTools(defs: AI.ModelToolSet | undefined) {
  const restoreName = new Map<string, string>();
  if (!defs || Object.keys(defs).length === 0) return { tools: undefined, restoreName };
  // Raycast executes tools itself and sends their results on the next request.
  const tools: ToolSet = {};
  for (const [name, definition] of Object.entries(defs)) {
    const wireName = toWireToolName(name);
    if (wireName !== name) restoreName.set(wireName, name);
    tools[wireName] = tool({
      description: definition.description,
      inputSchema: jsonSchema(
        (definition.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
      ),
    });
  }
  return { tools, restoreName };
}

function toMessages(messages: AI.ModelMessage[]): ModelMessage[] {
  return messages.map((message) => {
    if (message.role === "assistant") {
      return {
        ...message,
        content: message.content.map((p) =>
          p.type === "tool-call" ? { ...p, toolName: toWireToolName(p.toolName) } : p,
        ),
      };
    }
    if (message.role === "tool") {
      return { ...message, content: message.content.map((p) => ({ ...p, toolName: toWireToolName(p.toolName) })) };
    }
    return message;
  }) as ModelMessage[];
}
