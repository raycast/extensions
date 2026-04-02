import { Cache, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { fetchModelsData } from "../lib/api";
import type { ModelsData } from "../lib/types";

const cache = new Cache();
const CACHE_KEY = "models-data";

/**
 * Hook to fetch models data from models.dev
 *
 * Uses direct fetch + Cache API instead of useCachedPromise to avoid
 * Uses direct fetch + Cache API instead of useCachedPromise to avoid
 * memory spikes during fresh cache population. See:
 * https://github.com/raycast/utils/issues/65
 */
export function useModelsData() {
  const [data, setData] = useState<ModelsData | null>(() => {
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as ModelsData;
      } catch {
        cache.remove(CACHE_KEY);
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!data);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Already have cached data or already fetching
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // If we have cached data, still revalidate in background
    const shouldRevalidate = !!data;

    if (!shouldRevalidate) {
      setIsLoading(true);
    }

    fetchModelsData()
      .then((result) => {
        setData(result);
        setIsLoading(false);
        // Cache write happens after state update to reduce peak memory
        cache.set(CACHE_KEY, JSON.stringify(result));
      })
      .catch((error) => {
        setIsLoading(false);
        // Only show error if we don't have cached data to fall back on
        if (!data) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load models",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
  }, []);

  return { data, isLoading };
}
