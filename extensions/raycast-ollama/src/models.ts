import type { AI } from "@raycast/api";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { OllamaApiModelCapability, OllamaServerAuthorizationMethod } from "./lib/ollama/enum";
import { Ollama } from "./lib/ollama/ollama";
import type { OllamaApiShowResponse, OllamaApiTagsResponseModel, OllamaServer } from "./lib/ollama/types";
import { GetOllamaServerByName, GetOllamaServers } from "./lib/settings/settings";

const DEFAULT_CONTEXT = 4096;
const LOCAL_SERVER_NAME = "Local";

export const getModels: AI.GetModels = async () => {
  const servers = await GetOllamaServers();
  const registrations = await Promise.all(
    [...servers.entries()].map(async ([serverName, server]) => {
      return getServerModels(serverName, server, servers.size);
    }),
  );

  return registrations.flat().sort((left, right) => left.title.localeCompare(right.title));
};

// Ollama exposes an OpenAI-compatible endpoint, so we let the AI SDK handle the request/stream
// mapping (text, reasoning, tool calls, vision, usage) instead of hand-rolling it.
export const streamCompletion: AI.StreamCompletion = async (model, request) => {
  const { serverName, modelName } = decodeModelId(model.id);
  const server = await GetOllamaServerByName(serverName);

  const ollama = createOpenAICompatible({
    name: "ollama",
    baseURL: `${server.url}/v1`,
    headers: getAuthHeaders(server),
  });

  return streamText({
    model: ollama(modelName),
    system: request.system,
    messages: request.messages ?? [],
    temperature: request.temperature,
    tools: toAiTools(request.tools),
    toolChoice: request.toolChoice,
  });
};

async function getServerModels(
  serverName: string,
  server: OllamaServer,
  serverCount: number,
): Promise<AI.RegisteredModel[]> {
  const ollama = new Ollama(server);

  try {
    const tags = await ollama.OllamaApiTags();
    const models = await Promise.all(
      tags.models.map(async (tag) => {
        const show = await ollama.OllamaApiShow(tag.name).catch((error: Error) => {
          console.error(`Failed to inspect Ollama model "${tag.name}" on "${serverName}": ${error.message}`);
          return undefined;
        });

        if (!supportsChatModel(show)) {
          return undefined;
        }

        return toRegisteredModel(serverName, serverCount, tag, show);
      }),
    );

    return models.filter((model): model is AI.RegisteredModel => model !== undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to load Ollama models from "${serverName}": ${message}`);
    return [];
  }
}

function toRegisteredModel(
  serverName: string,
  serverCount: number,
  model: OllamaApiTagsResponseModel,
  show: OllamaApiShowResponse | undefined,
): AI.RegisteredModel {
  const ollamaCapabilities = show?.capabilities ?? [];
  const name = formatModelTitle(model.name);
  const title = serverCount > 1 ? `${name} (${serverName})` : name;

  return {
    id: encodeModelId(serverName, model.name),
    title,
    icon: { source: { light: "icon.png", dark: "icon@dark.png" } },
    description: getModelDescription(serverName, model),
    isLocal: serverName === LOCAL_SERVER_NAME,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: true },
      streaming: { supported: true },
      ...(ollamaCapabilities.includes(OllamaApiModelCapability.TOOLS) ? { tools: { supported: true } } : {}),
      ...(ollamaCapabilities.includes(OllamaApiModelCapability.THINKING)
        ? { reasoningEffort: { supported: true, options: ["medium"], default: "medium" } }
        : {}),
      ...(ollamaCapabilities.includes(OllamaApiModelCapability.VISION)
        ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } }
        : {}),
    },
    contextWindow: getContextLength(show),
    sizeInBytes: model.size,
  };
}

function supportsChatModel(show: OllamaApiShowResponse | undefined): boolean {
  const capabilities = show?.capabilities;
  if (!capabilities?.length) {
    return true;
  }

  return (
    capabilities.includes(OllamaApiModelCapability.COMPLETION) || capabilities.includes(OllamaApiModelCapability.VISION)
  );
}

function getModelDescription(serverName: string, model: OllamaApiTagsResponseModel): string {
  const details = [
    model.details.parameter_size,
    model.details.quantization_level,
    model.details.family,
    serverName === LOCAL_SERVER_NAME ? undefined : serverName,
  ].filter((detail): detail is string => typeof detail === "string" && detail.length > 0);

  return details.length > 0 ? details.join(" - ") : "Ollama model";
}

// Ollama's default ":latest" tag is noise; drop it for the title. Meaningful tags (e.g. ":7b") stay.
function formatModelTitle(name: string): string {
  const withoutLatest = name.replace(/:latest$/, "");
  return withoutLatest.length > 0 ? withoutLatest : name;
}

function getContextLength(show: OllamaApiShowResponse | undefined): number {
  const fromParameters = getContextLengthFromParameters(show?.parameters);
  if (fromParameters !== undefined) {
    return fromParameters;
  }

  // The architecture maximum does not describe the server's configured context.
  // The OpenAI-compatible endpoint cannot set num_ctx, so keep a conservative
  // fallback unless the model explicitly configures it in its Modelfile.
  const maximum = getContextLengthFromModelInfo(show?.model_info);
  return Math.min(DEFAULT_CONTEXT, maximum ?? DEFAULT_CONTEXT);
}

function getContextLengthFromModelInfo(modelInfo: OllamaApiShowResponse["model_info"]): number | undefined {
  if (!modelInfo) {
    return undefined;
  }

  for (const [key, value] of Object.entries(modelInfo)) {
    if (key.endsWith(".context_length") && typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
}

function getContextLengthFromParameters(parameters: string | undefined): number | undefined {
  const match = parameters?.match(/\bnum_ctx\s+(\d+)/);
  if (!match) {
    return undefined;
  }

  const context = Number(match[1]);
  return Number.isFinite(context) && context > 0 ? context : undefined;
}

function toAiTools(tools: AI.ModelToolSet | undefined): ToolSet | undefined {
  if (!tools) {
    return undefined;
  }

  const entries = Object.entries(tools);
  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    entries.map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema((definition.inputSchema ?? {}) as Parameters<typeof jsonSchema>[0]),
      }),
    ]),
  );
}

function getAuthHeaders(server: OllamaServer): Record<string, string> {
  const headers: Record<string, string> = {};

  if (server.auth?.mode === OllamaServerAuthorizationMethod.BASIC && server.auth.username && server.auth.password) {
    headers.Authorization = `Basic ${Buffer.from(`${server.auth.username}:${server.auth.password}`).toString("base64")}`;
  }

  if (server.auth?.mode === OllamaServerAuthorizationMethod.BEARER && server.auth.token) {
    headers.Authorization = `Bearer ${server.auth.token}`;
  }

  return headers;
}

function encodeModelId(serverName: string, modelName: string): string {
  return `${encodeURIComponent(serverName)}/${encodeURIComponent(modelName)}`;
}

function decodeModelId(id: string): { serverName: string; modelName: string } {
  const separatorIndex = id.indexOf("/");
  if (separatorIndex === -1) {
    return { serverName: LOCAL_SERVER_NAME, modelName: id };
  }

  return {
    serverName: decodeURIComponent(id.slice(0, separatorIndex)),
    modelName: decodeURIComponent(id.slice(separatorIndex + 1)),
  };
}
