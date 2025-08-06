import { useCachedPromise } from "@raycast/utils";
import { cometBrowser } from "../lib/comet";
import { CometTab } from "../lib/types";
import { handleError } from "../lib/utils";

export function useCometTabs() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (): Promise<CometTab[]> => {
      try {
        const isRunning = await cometBrowser.isCometRunning();
        if (!isRunning) {
          throw new Error("Comet browser is not running");
        }

        return await cometBrowser.getTabs();
      } catch (error) {
        await handleError(error, "getting tabs");
        return [];
      }
    },
    [],
    {
      keepPreviousData: true,
      initialData: [],
      failureRetryCount: 2,
      // Optimized caching strategy for better performance
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Cache for 30 seconds for better performance
      revalidateAfterSeconds: 30,
      // Enable stale-while-revalidate for instant responses
      staleTime: 10000, // 10 seconds stale time
    },
  );

  return {
    tabs: data || [],
    isLoading,
    error,
    refresh: revalidate,
  };
}
