import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getCachedData, fetchModelsData } from "../lib/api";

/**
 * Hook to fetch models data from models.dev
 * Caches transformed data to disk for instant subsequent loads.
 */
export function useModelsData() {
  return useCachedPromise(fetchModelsData, [], {
    initialData: getCachedData() ?? undefined,
    keepPreviousData: true,
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load models",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
