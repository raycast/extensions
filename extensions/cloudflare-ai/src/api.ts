import { getPreferenceValues } from "@raycast/api";
import { AIResponse, ModelsResponse, ModelDropdownItem, Message } from "./types";
import { detectModelType, buildRequestBody, buildRequestBodyWithHistory, formatModelName } from "./models";
import { parseAIResponse } from "./parsers";

interface CloudflareErrorPayload {
  errors?: Array<{ message?: string }>;
}

function parseCloudflareErrorMessage(errorText: string): string {
  try {
    const parsed = JSON.parse(errorText) as CloudflareErrorPayload;
    const message = parsed.errors?.[0]?.message;
    if (message && message.trim()) {
      return message;
    }
  } catch {
    // Keep original text if the response body is not JSON.
  }

  return errorText;
}

function normalizeErrorMessage(message: string): string {
  const cleaned = message
    .replace(/^AiError:\s*/i, "")
    .replace(/^Ai:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Unknown error";
  }

  return cleaned.length > 180 ? `${cleaned.slice(0, 177)}...` : cleaned;
}

function formatModelsFetchError(status: number, errorText: string): string {
  const rawMessage = parseCloudflareErrorMessage(errorText);
  const message = normalizeErrorMessage(rawMessage);

  switch (status) {
    case 401:
      return "Unauthorized. Check your API token and Workers AI permissions.";
    case 403:
      return "Access denied. Your account or token cannot list Workers AI models.";
    default:
      return `Failed to load models (${status}): ${message}`;
  }
}

function formatRunError(status: number, model: string, requestShape: string, errorText: string): string {
  const rawMessage = parseCloudflareErrorMessage(errorText);
  const message = normalizeErrorMessage(rawMessage);

  switch (status) {
    case 400:
      return `Invalid request for ${formatModelName(model)} (payload: ${requestShape}). ${message}`;
    case 401:
      return "Unauthorized. Check your API token and Workers AI permissions.";
    case 403: {
      const lower = message.toLowerCase();
      if (lower.includes("not allowed") || lower.includes("not enabled") || lower.includes("not authorized")) {
        return `Your account is not allowed to use ${formatModelName(model)} yet. Try another model or request access in Cloudflare.`;
      }
      return `Access denied for ${formatModelName(model)}. Verify account access and token scope.`;
    }
    case 404:
      return `${formatModelName(model)} is unavailable for this account or region.`;
    case 429:
      return "Rate limit reached. Please retry in a moment.";
    default:
      return `Cloudflare AI error (${status}) for ${formatModelName(model)}: ${message}`;
  }
}

function isTextCapableTask(taskName?: string): boolean {
  const normalizedTask = taskName?.toLowerCase() ?? "";
  return (
    normalizedTask.includes("text generation") ||
    normalizedTask.includes("chat completion") ||
    normalizedTask.includes("text-generation") ||
    normalizedTask.includes("chat")
  );
}

function isKnownTextModelName(modelName: string): boolean {
  const normalizedName = modelName.toLowerCase();
  const families = [
    "llama",
    "mistral",
    "granite",
    "qwen",
    "gemma",
    "phi",
    "gpt-oss",
    "kimi",
    "glm",
    "internlm",
    "baichuan",
    "deepseek",
  ];

  return families.some((family) => normalizedName.includes(family));
}

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
      const errorText = await response.text();
      throw new Error(formatModelsFetchError(response.status, errorText));
    }

    const data = (await response.json()) as ModelsResponse;

    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || "Failed to fetch models");
    }

    // Filter for text generation models and format for dropdown
    const models = data.result
      .filter((model) => isTextCapableTask(model.task?.name) || isKnownTextModelName(model.name))
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
  const requestShape = Object.keys(requestBody).join(", ");

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
      throw new Error(formatRunError(response.status, model, requestShape, errorText));
    }

    const data = (await response.json()) as AIResponse;

    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || `Unknown error occurred for model "${model}"`);
    }

    return parseAIResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Unknown error");
  }
}

export async function queryCloudflareAIWithHistory(messages: Message[], model: string): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();
  const { accountId, apiToken } = preferences;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const modelType = detectModelType(model);
  const requestBody = buildRequestBodyWithHistory(messages, modelType);
  const requestShape = Object.keys(requestBody).join(", ");

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
      throw new Error(formatRunError(response.status, model, requestShape, errorText));
    }

    const data = (await response.json()) as AIResponse;

    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || `Unknown error occurred for model "${model}"`);
    }

    return parseAIResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Unknown error");
  }
}
