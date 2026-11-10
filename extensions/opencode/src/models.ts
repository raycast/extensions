import { getPreferenceValues, type AI } from "@raycast/api";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { jsonSchema, streamText, tool, type ToolSet } from "ai";
import { loadModels, type Format, type Source } from "./console";
import { defaultEffort, loadReasoningSupport, resolveVariants, saveVariants, variantOptions } from "./reasoning";

const INFERENCE_URL = "https://opencode.ai/inference";

export const getModels: AI.GetModels = async () => {
  const [models, reasoning] = await Promise.all([
    loadModels(getPreferenceValues<Preferences>().apiKey),
    loadReasoningSupport(),
  ]);
  const variants: Parameters<typeof saveVariants>[0] = {};
  const registered = models.map((model): AI.RegisteredModel => {
    // Raycast only passes the ID back to streamCompletion, so it carries the API format, and the source for Go.
    const id = `${model.source === "go" ? "go/" : ""}${model.format}/${model.id}`;
    const resolved = resolveVariants(model, reasoning[model.source][model.id] ?? []);
    const efforts = resolved.map(([effort]) => effort);
    variants[id] = Object.fromEntries(resolved);
    return {
      id,
      title: model.source === "go" ? `${model.title} (Go)` : model.title,
      description: model.source === "go" ? "Included in your OpenCode Go subscription" : price(model.price),
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
  const { source, format, modelID } = parseID(model.id);
  const { reasoningEffort: effort, sessionId } = request.providerOptions.raycast;
  return streamText({
    model: languageModel(source, format, modelID, getPreferenceValues<Preferences>().apiKey, sessionId),
    system: request.system,
    messages: request.messages ?? [],
    temperature: model.capabilities?.temperature?.supported ? request.temperature : undefined,
    tools: toTools(request.tools),
    toolChoice: request.toolChoice,
    providerOptions: effort ? variantOptions(model.id, effort) : undefined,
    maxRetries: 0,
  });
};

function price(cost: { input: number; output: number } | undefined) {
  return cost && `$${cost.input} in · $${cost.output} out per 1M tokens`;
}

// Zen IDs predate Go and stay unprefixed so saved model selections keep working.
function parseID(id: string) {
  const [first, ...rest] = id.split("/");
  const source: Source = first === "go" ? "go" : "zen";
  const [format, ...model] = (source === "go" ? rest : [first, ...rest]) as [Format, ...string[]];
  return { source, format, modelID: model.join("/") };
}

function languageModel(source: Source, format: Format, modelID: string, apiKey: string, session: string) {
  const baseURL = source === "go" ? `${INFERENCE_URL}/go` : INFERENCE_URL;
  // Go rejects requests without a session, which it uses to keep a conversation on one route.
  const headers = { "x-opencode-client": "raycast", ...(source === "go" ? { "x-opencode-session": session } : {}) };
  switch (format) {
    case "anthropic":
      return createAnthropic({ baseURL: `${baseURL}/anthropic/v1`, apiKey, headers })(modelID);
    case "openai":
      return createOpenAI({ baseURL: `${baseURL}/openai/v1`, apiKey, headers }).responses(modelID);
    case "google":
      return createGoogleGenerativeAI({ baseURL: `${baseURL}/google/v1beta`, apiKey, headers })(modelID);
    default:
      return createOpenAICompatible({ name: "opencode", baseURL: `${baseURL}/openai/v1`, apiKey, headers })(modelID);
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
