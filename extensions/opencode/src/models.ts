import { getPreferenceValues, type AI } from "@raycast/api";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { loadModels, type Format } from "./console";
import { defaultEffort, loadReasoningSupport, resolveVariants, saveVariants, variantOptions } from "./reasoning";

const INFERENCE_URL = "https://opencode.ai/inference";

export const getModels: AI.GetModels = async () => {
  const [models, reasoning] = await Promise.all([
    loadModels(getPreferenceValues<Preferences>().apiKey),
    loadReasoningSupport(),
  ]);
  const variants: Parameters<typeof saveVariants>[0] = {};
  const registered = models.map((model): AI.RegisteredModel => {
    // Raycast only passes the ID back to streamCompletion, so it carries the API format too.
    const id = `${model.format}/${model.id}`;
    const resolved = resolveVariants(model, reasoning[model.id] ?? []);
    const efforts = resolved.map(([effort]) => effort);
    variants[id] = Object.fromEntries(resolved);
    return {
      id,
      title: model.title,
      description: model.price && `$${model.price.input} in · $${model.price.output} out per 1M tokens`,
      icon: "extension-icon.png",
      contextWindow: model.contextWindow,
      capabilities: {
        systemMessage: { supported: true },
        temperature: { supported: model.temperature },
        streaming: { supported: true },
        tools: { supported: model.tools },
        ...(model.vision ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } } : {}),
        ...(efforts.length > 0
          ? {
              reasoningEffort: { supported: true, options: efforts, default: defaultEffort(model.format, efforts) },
            }
          : {}),
      },
    };
  });
  saveVariants(variants);
  return registered;
};

export const streamCompletion: AI.StreamCompletion = (model, request) => {
  const { format, modelID } = parseID(model.id);
  const effort = request.providerOptions?.raycast?.reasoningEffort;
  return streamText({
    model: languageModel(format, modelID, getPreferenceValues<Preferences>().apiKey),
    system: request.system,
    messages: request.messages ?? [],
    temperature: model.capabilities?.temperature?.supported ? request.temperature : undefined,
    tools: toTools(request.tools),
    toolChoice: request.toolChoice,
    providerOptions: effort ? variantOptions(model.id, effort) : undefined,
    maxRetries: 0,
  });
};

function parseID(id: string) {
  const [format, ...rest] = id.split("/") as [Format, ...string[]];
  return { format, modelID: rest.join("/") };
}

function languageModel(format: Format, modelID: string, apiKey: string) {
  switch (format) {
    case "anthropic":
      return createAnthropic({ baseURL: `${INFERENCE_URL}/anthropic/v1`, apiKey })(modelID);
    case "openai":
      return createOpenAI({ baseURL: `${INFERENCE_URL}/openai/v1`, apiKey }).responses(modelID);
    case "google":
      return createGoogleGenerativeAI({ baseURL: `${INFERENCE_URL}/google/v1beta`, apiKey })(modelID);
    default:
      return createOpenAICompatible({ name: "opencode", baseURL: `${INFERENCE_URL}/openai/v1`, apiKey })(modelID);
  }
}

function toTools(tools: AI.ModelToolSet | undefined): ToolSet | undefined {
  if (!tools || Object.keys(tools).length === 0) return undefined;
  // Raycast executes tools itself and sends their results on the next request.
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => [
      name,
      tool({
        description: definition.description,
        inputSchema: jsonSchema(
          (definition.inputSchema ?? { type: "object", properties: {} }) as Parameters<typeof jsonSchema>[0],
        ),
      }),
    ]),
  );
}
