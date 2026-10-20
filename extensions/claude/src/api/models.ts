import { LocalStorage, getPreferenceValues } from "@raycast/api";

export interface AvailableModel {
  id: string;
  display_name: string;
  created_at: string;
  /** Output-token ceiling as advertised by the API. Absent on older API responses. */
  max_tokens?: number;
  /**
   * Maximum input context window in tokens, as advertised by the API. Absent on older
   * API responses. This is the whole input budget and `max_tokens` is NOT drawn from it —
   * the two are separate limits, so `src/utils/contextWindow.ts` spends this entire value
   * on conversation history rather than reserving output headroom out of it.
   */
  max_input_tokens?: number;
}

interface ModelApiResponse {
  data: Array<{
    type: "model";
    id: string;
    display_name: string;
    created_at: string;
    max_tokens?: number;
    max_input_tokens?: number;
  }>;
  has_more: boolean;
  first_id: string | null;
  last_id: string | null;
}

/** The endpoint's maximum page size; it defaults to 20 without this. */
const MODELS_PAGE_LIMIT = 1000;

/** Stops a malformed `has_more` from looping forever. */
const MAX_MODEL_PAGES = 10;

const MODELS_CACHE_KEY = "available_models_cache";

// Hardcoded fallback list in case API and cache both fail
const FALLBACK_MODELS: AvailableModel[] = [
  {
    id: "claude-haiku-4-5-20251001",
    display_name: "Claude Haiku 4.5",
    created_at: "2025-10-15T00:00:00Z",
    max_tokens: 64000,
  },
  {
    id: "claude-sonnet-4-5-20250929",
    display_name: "Claude Sonnet 4.5",
    created_at: "2025-09-29T00:00:00Z",
    max_tokens: 64000,
  },
  {
    id: "claude-opus-4-1-20250805",
    display_name: "Claude Opus 4.1",
    created_at: "2025-08-05T00:00:00Z",
    max_tokens: 32000,
  },
];

/**
 * Fetches every available model from the Anthropic API.
 *
 * The endpoint is cursor-paginated and returns 20 models per page by default, so a
 * single request silently truncates the list — an account with more models than one
 * page would simply never see the rest. This requests the maximum page size and
 * follows `has_more`/`last_id` until the list is exhausted.
 */
export async function fetchAvailableModels(): Promise<AvailableModel[]> {
  const { apiKey } = getPreferenceValues<Preferences>();

  try {
    const models: AvailableModel[] = [];
    let afterId: string | null = null;

    for (let page = 0; page < MAX_MODEL_PAGES; page++) {
      const url = new URL("https://api.anthropic.com/v1/models");
      url.searchParams.set("limit", String(MODELS_PAGE_LIMIT));
      if (afterId) url.searchParams.set("after_id", afterId);

      const response = await fetch(url, {
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

      const data = (await response.json()) as ModelApiResponse;

      models.push(
        ...data.data.map((model) => ({
          id: model.id,
          display_name: model.display_name,
          created_at: model.created_at,
          max_tokens: model.max_tokens,
          max_input_tokens: model.max_input_tokens,
        }))
      );

      if (!data.has_more || !data.last_id) break;
      afterId = data.last_id;
    }

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
