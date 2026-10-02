import { getPreferenceValues, type AI } from "@raycast/api";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type JSONValue } from "ai";
import { loadModels, type Format } from "./console";
import { goLanguageModel, goSessionHeaders, loadGoModels } from "./go";
import { defaultEffort, loadReasoningSupport, resolveVariants, saveVariants, variantOptions } from "./reasoning";
import { restoreToolNames, shortenMessages, toTools } from "./tools";

const INFERENCE_URL = "https://opencode.ai/inference";

export const getModels: AI.GetModels = async () => {
  const { apiKey, go } = getPreferenceValues<Preferences>();
  const [models, reasoning, goModels] = await Promise.all([
    loadModels(apiKey),
    loadReasoningSupport(),
    go ? loadGoModels(apiKey) : [],
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
  // Go shares model IDs with the catalog, so reuse its metadata where the model is in both.
  const catalog = new Map(models.map((model) => [model.id, model]));
  return [...registered, ...goModels.map((id) => goModel(id, catalog.get(id)))];
};

function goModel(id: string, model?: Awaited<ReturnType<typeof loadModels>>[number]): AI.RegisteredModel {
  return {
    id: `go/${id}`,
    title: `${model?.title ?? id} (Go)`,
    description: "Included in your OpenCode Go subscription",
    icon: "extension-icon.png",
    contextWindow: model?.contextWindow,
    capabilities: {
      systemMessage: { supported: true },
      // GPT-5 and later reasoning models reject temperature.
      temperature: { supported: model?.temperature ?? !id.startsWith("gpt-") },
      streaming: { supported: true },
      tools: { supported: model?.tools ?? true },
      ...(model?.vision ? { vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] } } : {}),
    },
  };
}

export const streamCompletion: AI.StreamCompletion = (model, request) => {
  const effort = request.providerOptions?.raycast?.reasoningEffort;
  return stream(
    model.id,
    { ...request, temperature: model.capabilities?.temperature?.supported ? request.temperature : undefined },
    effort ? variantOptions(model.id, effort) : undefined,
  );
};

// Shared with Ask OpenCode, which streams outside Raycast AI.
export function stream(
  id: string,
  request: AI.ModelRequest,
  providerOptions?: Record<string, Record<string, JSONValue>>,
) {
  const { format, modelID } = parseID(id);
  const apiKey = getPreferenceValues<Preferences>().apiKey;
  const messages = request.messages ?? [];
  const tools = toTools(request.tools);
  const result = streamText({
    model: format === "go" ? goLanguageModel(modelID, apiKey) : languageModel(format, modelID, apiKey),
    system: request.system,
    messages: shortenMessages(messages, tools.shorten),
    temperature: request.temperature,
    tools: tools.tools,
    toolChoice: request.toolChoice,
    headers: format === "go" ? goSessionHeaders(messages) : undefined,
    providerOptions,
    maxRetries: 0,
  });
  if (tools.restore.size === 0) return result;
  return {
    fullStream: (async function* () {
      for await (const part of result.fullStream) yield restoreToolNames(part, tools.restore) as AI.ModelStreamPart;
    })(),
  };
}

function parseID(id: string) {
  const [format, ...rest] = id.split("/") as [Format | "go", ...string[]];
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
