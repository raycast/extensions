import { getPreferenceValues } from "@raycast/api";
import { AIResponse, ModelsResponse, ModelDropdownItem, Message } from "./types";
import { detectModelType, buildRequestBody, buildRequestBodyWithHistory, formatModelName } from "./models";
import { parseAIResponse } from "./parsers";

export async function fetchCloudflareModels(): Promise<ModelDropdownItem[]> {
  const preferences = getPreferenceValues<Preferences>();
  const { accountId, apiToken } = preferences;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = (await response.json()) as ModelsResponse;

    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Failed to fetch models");
    }

    // Filter for text generation models and format for dropdown
    const models = data.result
      .filter(
        (model) =>
          model.task?.name === "Text Generation" || model.name.includes("llama") || model.name.includes("mistral"),
      )
      .map((model) => ({
        title: formatModelName(model.name),
        value: model.name,
      }));

    // Cache models to LocalStorage for faster loading
    try {
      const { LocalStorage } = await import("@raycast/api");
      await LocalStorage.setItem("cached-models", JSON.stringify(models));
      await LocalStorage.setItem("cached-models-timestamp", Date.now().toString());
    } catch (cacheError) {
      console.error("Failed to cache models:", cacheError);
      // Continue even if caching fails
    }

    return models;
  } catch (error) {
    console.error("Error fetching models:", error);

    // Try to load from cache if API fails
    try {
      const { LocalStorage } = await import("@raycast/api");
      const cached = await LocalStorage.getItem<string>("cached-models");
      if (cached) {
        console.log("Loading models from cache due to API failure");
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.error("Failed to load cached models:", cacheError);
    }

    throw error;
  }
}

export async function queryCloudflareAI(prompt: string, model: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const { accountId, apiToken } = preferences;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const modelType = detectModelType(model);
  const requestBody = buildRequestBody(prompt, modelType);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as AIResponse;

    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Unknown error occurred");
    }

    return parseAIResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query Cloudflare AI: ${error.message}`);
    }
    throw new Error("Failed to query Cloudflare AI: Unknown error");
  }
}

export async function queryCloudflareAIWithHistory(messages: Message[], model: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const { accountId, apiToken } = preferences;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const modelType = detectModelType(model);
  const requestBody = buildRequestBodyWithHistory(messages, modelType);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as AIResponse;

    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Unknown error occurred");
    }

    return parseAIResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query Cloudflare AI: ${error.message}`);
    }
    throw new Error("Failed to query Cloudflare AI: Unknown error");
  }
}
