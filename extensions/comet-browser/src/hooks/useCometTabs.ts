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
      // Optimized caching strategy for better performance
      // Cache for 30 seconds for better performance
    },
  );

  return {
    tabs: data || [],
    isLoading,
    error,
    refresh: revalidate,
  };
}
