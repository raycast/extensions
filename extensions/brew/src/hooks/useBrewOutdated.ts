/**
 * Hook for fetching outdated brew packages.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchOutdated, brewUpdate, OutdatedResults, isBrewLockError, getErrorMessage, brewLogger } from "../utils";
import { preferences } from "../utils";

/**
 * Hook to fetch and cache outdated brew packages.
 *
 * Uses a two-phase fetch strategy for faster initial load:
 * 1. First, fetch outdated packages WITHOUT running brew update (fast, ~1s)
 * 2. Then, run brew update in background and refresh (slower, ~5-10s)
 *
 * This shows potentially stale data immediately, then updates with fresh data.
 *
 * @returns Object containing loading state, data, isRefreshing flag, and revalidate function
 */
export function useBrewOutdated() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasRefreshedRef = useRef(false);

  const result = useCachedPromise(
    async (): Promise<OutdatedResults> => {
      // On first load, skip update for speed
      // The background refresh will update the data
      return await brewFetchOutdated(preferences.greedyUpgrades, undefined, true);
    },
    [],
    {
      keepPreviousData: true,
      onError: async (error) => {
        brewLogger.error("Failed to fetch outdated packages", {
          errorType: error.name,
          message: error.message,
          isLockError: isBrewLockError(error),
        });

        const isLock = isBrewLockError(error);
        const message = getErrorMessage(error);

        await showToast({
          style: Toast.Style.Failure,
          title: isLock ? "Brew is Busy" : "Failed to fetch outdated packages",
          message: isLock ? "Another brew process is running. Please wait and try again." : message,
          primaryAction: {
            title: "Retry",
            onAction: (toast) => {
              toast.hide();
              result.revalidate();
            },
          },
        });
      },
    },
  );

  // Background refresh: run brew update then fetch fresh outdated data
  const refreshInBackground = useCallback(async () => {
    if (hasRefreshedRef.current || result.isLoading) return;
    hasRefreshedRef.current = true;
    setIsRefreshing(true);

    brewLogger.log("Starting background refresh for outdated packages");

    try {
      // Run brew update
      await brewUpdate();
      // Then fetch fresh outdated data (skipUpdate since we just did it)
      const freshData = await brewFetchOutdated(preferences.greedyUpgrades, undefined, true);

      // Only update if we got different results
      if (
        freshData.formulae.length !== result.data?.formulae.length ||
        freshData.casks.length !== result.data?.casks.length
      ) {
        brewLogger.log("Background refresh found changes", {
          oldFormulae: result.data?.formulae.length ?? 0,
          newFormulae: freshData.formulae.length,
          oldCasks: result.data?.casks.length ?? 0,
          newCasks: freshData.casks.length,
        });
        // Trigger a revalidate to update the UI with fresh data
        result.revalidate();
      } else {
        brewLogger.log("Background refresh complete, no changes");
      }
    } catch (error) {
      brewLogger.warn("Background refresh failed", { error });
      // Don't show error toast for background refresh failures
    } finally {
      setIsRefreshing(false);
    }
  }, [result]);

  // Start background refresh after initial data loads
  useEffect(() => {
    if (!result.isLoading && result.data && !hasRefreshedRef.current) {
      refreshInBackground();
    }
  }, [result.isLoading, result.data, refreshInBackground]);

  return {
    ...result,
    isRefreshing,
  };
}
