import { ApiSettings, sanitizeApiSettings } from "./api-settings";
import { buildChatRequestBody, buildChatUrl, parseChatResponse } from "./llm-client";
import { FetchLike, listModels, ModelOption, parseRaycastAIModelEnum, requestHeaders } from "./model-list";

export interface ApiValidationResult {
  model: ModelOption;
  responseText: string;
}

export interface RaycastAIValidationAdapter {
  canAccess: () => boolean;
  models: Record<string, string>;
}

async function getDefaultRaycastAIValidationAdapter(): Promise<RaycastAIValidationAdapter> {
  const { AI, environment } = await import("@raycast/api");
  return {
    canAccess: () => environment.canAccess(AI),
    models: AI.Model as Record<string, string>,
  };
}

export async function validateApiConnection(
  rawSettings: ApiSettings,
  fetcher: FetchLike = fetch,
  onProgress?: (message: string) => void,
  raycastAI?: RaycastAIValidationAdapter,
): Promise<ApiValidationResult> {
  const settings = sanitizeApiSettings(rawSettings);
  if (settings.apiCompatible === "raycast") {
    onProgress?.("Checking Raycast AI access");
    const adapter = raycastAI ?? (await getDefaultRaycastAIValidationAdapter());
    if (!adapter.canAccess()) {
      throw new Error("Raycast AI requires Raycast Pro access");
    }

    onProgress?.("Checking Raycast AI models");
    const models = parseRaycastAIModelEnum(adapter.models);
    const model = settings.validatedModel ? { id: settings.validatedModel, name: settings.validatedModel } : models[0];
    if (!model) {
      throw new Error("Raycast AI model list is empty");
    }
    return { model, responseText: "Raycast AI is available" };
  }

  if (!settings.apiBase) {
    throw new Error("API Base is required");
  }
  if (settings.apiCompatible === "anthropic" && !settings.apiKey) {
    throw new Error("API Key is required for Anthropic");
  }

  onProgress?.("Checking model list");
  const models = await listModels(settings, fetcher);
  const model = settings.validatedModel ? { id: settings.validatedModel, name: settings.validatedModel } : models[0];
  if (!model) {
    throw new Error("Model list is empty");
  }

  onProgress?.("Sending hi chat");
  const response = await fetcher(buildChatUrl(settings), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...requestHeaders(settings),
    },
    body: JSON.stringify(
      buildChatRequestBody(
        {
          settings,
          model: model.id,
          messages: [{ role: "user", content: "hi" }],
          signal: new AbortController().signal,
        },
        false,
      ),
    ),
  });

  if (!response.ok) {
    throw new Error(`Chat validation failed: ${response.status}`);
  }

  const responseText = parseChatResponse(settings, await response.json()).trim();
  if (!responseText) {
    throw new Error("Chat validation returned an empty response");
  }

  return { model, responseText };
}
