import { getPreferenceValues } from "@raycast/api";

// Debug logging utility
function debugLog<T>(message: string, data?: T) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

interface GrokConfig {
  apiKey: string;
  baseURL: string;
}

interface Preferences {
  apiKey: string;
  useStream: boolean;
  isHistoryPaused: boolean;
  isCustomModel: boolean;
}

export function useGrokAPI(): GrokConfig {
  const config = getPreferenceValues<Preferences>();
  debugLog("Grok API Config", {
    apiKey: config.apiKey ? "[SET]" : "[MISSING]",
    baseURL: "https://api.x.ai/v1",
  });

  return {
    apiKey: config.apiKey,
    baseURL: "https://api.x.ai/v1",
  };
}

export function getConfiguration(): Preferences {
  const config = getPreferenceValues<Preferences>();
  debugLog("Configuration Retrieved", {
    apiKey: config.apiKey ? "[SET]" : "[MISSING]",
    useStream: config.useStream,
    isHistoryPaused: config.isHistoryPaused,
  });
  return config;
}

// API response types
interface APIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface ModelsResponse {
  object: string;
  data: APIModel[];
}

export async function fetchModels(apiKey: string): Promise<APIModel[]> {
  debugLog("Fetching models from API");

  try {
    const response = await fetch("https://api.x.ai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }

    const data: ModelsResponse = await response.json();
    debugLog("Models fetched successfully", data);

    return data.data || [];
  } catch (error) {
    debugLog("Error fetching models", error);
    throw error;
  }
}
