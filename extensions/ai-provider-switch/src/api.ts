import { Provider, RemoteModelsResponse } from "./types";
import { API_TIMEOUT } from "./constants";

function getApiKey(
  provider: Provider,
  apiKeyName?: string,
): string | undefined {
  if (!provider.api_keys) return undefined;
  if (apiKeyName) return provider.api_keys[apiKeyName];
  const keys = Object.values(provider.api_keys);
  return keys.length > 0 ? keys[0] : undefined;
}

function validateRemoteModelsResponse(data: unknown): RemoteModelsResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response: expected JSON object");
  }

  const response = data as Partial<RemoteModelsResponse>;
  if (!Array.isArray(response.data)) {
    throw new Error("Invalid response: expected data array");
  }

  return { data: response.data };
}

export async function testConnection(
  provider: Provider,
  apiKeyName?: string,
): Promise<{ success: boolean; message: string }> {
  const apiKey = getApiKey(provider, apiKeyName);
  const url = `${provider.base_url.replace(/\/+$/, "")}/models`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { headers, signal: controller.signal });

    if (response.ok) {
      return { success: true, message: "Connection successful" };
    }
    return {
      success: false,
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, message: "Connection timed out (5s)" };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function queryRemoteModels(
  provider: Provider,
  apiKeyName?: string,
): Promise<RemoteModelsResponse> {
  const apiKey = getApiKey(provider, apiKeyName);
  const url = `${provider.base_url.replace(/\/+$/, "")}/models`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { headers, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return validateRemoteModelsResponse(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Connection timed out (5s)");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
