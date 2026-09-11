import { useFetch } from "@raycast/utils";
import { Cache } from "@raycast/api";
import { OpenRouterModel, OpenRouterModelsResponse } from "../types";
import { useState, useCallback } from "react";
import { showFailureToast } from "@raycast/utils";
import { CACHE_DURATION, CACHE_KEYS } from "../constants/cache";

const cache = new Cache();

export function useModels(): {
  data: OpenRouterModel[] | undefined;
  isLoading: boolean;
  refresh: () => void;
} {
  const cached = cache.get(CACHE_KEYS.MODELS);
  const lastFetchTime = Number(cache.get(CACHE_KEYS.LAST_FETCH));
  const isStale = !lastFetchTime || Date.now() - lastFetchTime > CACHE_DURATION;
  const { data, isLoading } = useFetch<OpenRouterModelsResponse>("https://openrouter.ai/api/v1/models", {
    execute: !cached || isStale,
    onError: (error) => {
      showFailureToast(`Failed to fetch models: ${error.message}`);
    },
  });
  const [, forceUpdate] = useState({});

  const refresh = useCallback(() => {
    try {
      const modelsRemoved = cache.remove(CACHE_KEYS.MODELS);
      const lastFetchRemoved = cache.remove(CACHE_KEYS.LAST_FETCH);

      if (modelsRemoved && lastFetchRemoved) {
        forceUpdate({});
      }
    } catch (error) {
      showFailureToast(`Failed to clear cache: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, []);

  // Validate response structure
  if (data && (typeof data !== "object" || !data.data || !Array.isArray(data.data))) {
    showFailureToast("Response from OpenRouter contains invalid data");
    return { data: undefined, isLoading: false, refresh };
  }

  const allModels = data?.data;
  const currentTime = Date.now();

  if (cached && !isStale) {
    try {
      return { data: JSON.parse(cached) as OpenRouterModel[], isLoading: false, refresh };
    } catch (error) {
      showFailureToast(`Failed to parse cached data: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Remove corrupted cache and trigger immediate refresh
      try {
        cache.remove(CACHE_KEYS.MODELS);
        cache.remove(CACHE_KEYS.LAST_FETCH);
        forceUpdate({});
        return { data: undefined, isLoading: true, refresh };
      } catch (removeError) {
        showFailureToast(
          `Failed to remove corrupted cache: ${removeError instanceof Error ? removeError.message : "Unknown error"}`,
        );
      }
    }
  }

  if (isLoading || !allModels) {
    return { data: undefined, isLoading, refresh };
  }

  try {
    cache.set(CACHE_KEYS.MODELS, JSON.stringify(allModels));
    cache.set(CACHE_KEYS.LAST_FETCH, JSON.stringify(currentTime));
  } catch (error) {
    showFailureToast(`Failed to cache data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return { data: allModels, isLoading, refresh };
}
