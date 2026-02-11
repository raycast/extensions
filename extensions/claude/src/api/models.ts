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

// Hardcoded fallback list in case API and cache both fail
const FALLBACK_MODELS: AvailableModel[] = [
  { id: "claude-haiku-4-5-20251001", display_name: "Claude Haiku 4.5", created_at: "2025-10-15T00:00:00Z" },
  { id: "claude-sonnet-4-5-20250929", display_name: "Claude Sonnet 4.5", created_at: "2025-09-29T00:00:00Z" },
  { id: "claude-opus-4-1-20250805", display_name: "Claude Opus 4.1", created_at: "2025-08-05T00:00:00Z" },
];

/**
 * Fetches available models from the Anthropic API
 */
export async function fetchAvailableModels(): Promise<AvailableModel[]> {
  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
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
    // Fall back to hardcoded list if all else fails
    return FALLBACK_MODELS;
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
