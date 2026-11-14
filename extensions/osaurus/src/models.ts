import { logger } from "@chrismessina/raycast-logger";
import { type AI } from "@raycast/api";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { baseUrl, isLocalServer, listChatModels } from "./lib/osaurus";

const log = logger.child("[provider]");

export const getModels: AI.GetModels = async () => {
  log.log("getModels called");
  try {
    const isLocal = isLocalServer();
    const models = await listChatModels();
    log.log("getModels returning", { ids: models.map((m) => m.id) });
    return models.map((m): AI.RegisteredModel => ({
      id: m.id,
      title: m.id,
      icon: "extension-icon.png",
      description: [m.parameterSize, m.quantization].filter(Boolean).join(" · ") || m.name,
      isLocal,
      contextWindow: m.contextLength,
      capabilities: {
        systemMessage: { supported: true },
        temperature: { supported: true },
        streaming: { supported: true },
        ...(m.capabilities.includes("tools") ? { tools: { supported: true } } : {}),
        ...(m.capabilities.includes("vision")
          ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } }
          : {}),
      },
    }));
  } catch (error) {
    log.error("getModels failed", error);
    throw error;
  }
};

export const streamCompletion: AI.StreamCompletion = async (model, request) => {
  log.log("streamCompletion called", {
    model: model.id,
    messages: request.messages?.length ?? 0,
    tools: Object.keys(request.tools ?? {}).length,
  });
  const provider = createOpenAICompatible({ name: "osaurus", baseURL: `${baseUrl()}/v1` });
  return streamText({
    model: provider(model.id),
    system: request.system,
    messages: request.messages ?? [],
    // Raycast may send system-role messages in history; AI SDK 7 rejects them unless allowed.
    allowSystemInMessages: true,
    temperature: request.temperature,
    tools: toAiTools(request.tools),
    toolChoice: request.toolChoice,
    // Raycast owns retries and cancellation.
    maxRetries: 0,
    onError: ({ error }) => log.error("streamCompletion failed", error),
  });
};

function toAiTools(tools: AI.ModelToolSet | undefined): ToolSet | undefined {
  if (!tools || Object.keys(tools).length === 0) return undefined;
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema((definition.inputSchema ?? {}) as Parameters<typeof jsonSchema>[0]),
      }),
    ]),
  );
}
