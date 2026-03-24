import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchModelsData } from "../lib/api";

/**
 * Hook to fetch models data from models.dev
 * useCachedPromise persists the last successful result to disk automatically,
 * serving stale-while-revalidate on subsequent opens with no extra heap allocation.
 */
export function useModelsData() {
  return useCachedPromise(fetchModelsData, [], {
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
