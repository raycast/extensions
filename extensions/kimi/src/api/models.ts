import { LocalStorage, getPreferenceValues } from "@raycast/api";

export interface AvailableModel {
  id: string;
  display_name: string;
  created_at: string;
}

interface ModelApiResponse {
  data: Array<{
    type: "model";
    id: string;
    display_name: string;
    created_at: string;
  }>;
  has_more: boolean;
  first_id: string;
  last_id: string;
}

const MODELS_CACHE_KEY = "available_models_cache";

/**
 * Fetches available models from the Kimi API
 */
export async function fetchAvailableModels(): Promise<AvailableModel[]> {
  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;

  try {
    const response = await fetch("https://api.moonshot.ai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: ModelApiResponse = await response.json();

    // Transform API response to our internal format
    const models: AvailableModel[] = data.data.map((model) => ({
      id: model.id,
      display_name: model.display_name,
      created_at: model.created_at,
    }));

    // Cache the successful response
    await cacheModels(models);

    return models;
  } catch (error) {
    console.error("Failed to fetch models from API:", error);
    // Try to return cached models on error
    const cached = await getCachedModels();
    if (cached) {
      return cached;
    }
    // Return empty array if both API and cache fail
    return [];
  }
}

/**
 * Retrieves cached models from LocalStorage
 */
export async function getCachedModels(): Promise<AvailableModel[] | null> {
  try {
    const cached = await LocalStorage.getItem<string>(MODELS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as AvailableModel[];
    }
  } catch (error) {
    console.error("Failed to retrieve cached models:", error);
  }
  return null;
}

/**
 * Caches models to LocalStorage
 */
export async function cacheModels(models: AvailableModel[]): Promise<void> {
  try {
    await LocalStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(models));
  } catch (error) {
    console.error("Failed to cache models:", error);
  }
}

/**
 * Gets the display name for a model ID
 */
export function getModelDisplayName(modelId: string, availableModels: AvailableModel[]): string {
  const model = availableModels.find((m) => m.id === modelId);
  return model ? model.display_name : modelId;
}
