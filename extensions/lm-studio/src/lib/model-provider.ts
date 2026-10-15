import type { AI } from "@raycast/api";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { LMStudioClient, LMStudioError, type LMStudioClientOptions } from "./lmstudio";
import type { LMStudioModel } from "../types";

/** Shares the extension's server configuration while Raycast owns the conversation and tool execution. */
export function createModelProvider(options: LMStudioClientOptions) {
  const client = new LMStudioClient(options);
  const apiToken = options.apiToken?.trim();
  const provider = createOpenAICompatible({
    name: "lmstudio",
    baseURL: `${client.baseUrl}/v1`,
    headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
    fetch: options.fetch,
    supportsStructuredOutputs: false,
  });

  const getModels: AI.GetModels = async () => {
    const models = await client.listChatModels(AbortSignal.timeout(10_000));
    return models.map((model) => toRegisteredModel(model, client.baseUrl));
  };

  const streamCompletion: AI.StreamCompletion = async (model, request) => {
    const models = await client.listChatModels(AbortSignal.timeout(10_000));
    const current = models.find((candidate) => candidate.key === model.id);
    if (!current) throw new LMStudioError("This model is no longer available. Refresh LM Studio models and try again.");

    // Discovery must not allocate model memory. Load only for an explicit inference request,
    // including servers where LM Studio's just-in-time loading has been disabled.
    let instanceId = current.loadedInstances[0]?.id;
    if (!instanceId) {
      const loaded = await client.loadModel({ model: current.key }, AbortSignal.timeout(120_000));
      instanceId = loaded.instanceId;
    }

    return streamText({
      model: provider(instanceId),
      system: request.system,
      messages: request.messages ?? [],
      temperature: request.temperature,
      tools: toAiTools(request.tools),
      toolChoice: request.toolChoice,
      maxRetries: 0,
    });
  };

  return { getModels, streamCompletion };
}

function toRegisteredModel(model: LMStudioModel, baseUrl: string): AI.RegisteredModel {
  const hostname = new URL(baseUrl).hostname;
  const details = [model.paramsString, model.quantization?.name, model.description].filter(Boolean);
  return {
    id: model.key,
    title: model.displayName,
    icon: "icon.png",
    description: details.join(" · ") || undefined,
    isLocal: hostname === "localhost" || hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(hostname),
    contextWindow: model.loadedInstances[0]?.config.contextLength ?? model.maxContextLength,
    sizeInBytes: model.sizeBytes,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: true },
      streaming: { supported: true },
      ...(model.capabilities?.trainedForToolUse ? { tools: { supported: true } } : {}),
      ...(model.capabilities?.vision ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } } : {}),
      // Native /api/v1/chat reasoning settings are not a portable contract for
      // /v1/chat/completions. Reasoning still streams using the server's defaults.
    },
  };
}

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
