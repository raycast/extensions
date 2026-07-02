import { ApiSettings, sanitizeApiSettings } from "./api-settings";
import { buildChatRequestBody, buildChatUrl, parseChatResponse } from "./llm-client";
import { FetchLike, listModels, ModelOption, requestHeaders } from "./model-list";

export interface ApiValidationResult {
  model: ModelOption;
  responseText: string;
}

export async function validateApiConnection(
  rawSettings: ApiSettings,
  fetcher: FetchLike = fetch,
  onProgress?: (message: string) => void,
): Promise<ApiValidationResult> {
  const settings = sanitizeApiSettings(rawSettings);
  if (!settings.apiBase) {
    throw new Error("API Base is required");
  }
  if (settings.apiCompatible === "claude" && !settings.apiKey) {
    throw new Error("API Key is required for Claude");
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
