/**
 * Hook for fetching installed brew packages.
 *
 * Uses a two-phase loading strategy for better perceived performance:
 * 1. Fast initial load from cache or `brew list --json` (quick)
 * 2. Background refresh with full metadata via `brew info --json=v2 --installed`
 */

import { useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  brewFetchInstalled,
  brewFetchInstalledFast,
  InstalledMap,
  isBrewLockError,
  getErrorMessage,
  brewLogger,
} from "../utils";

/**
 * Hook to fetch and cache installed brew packages with optimized loading.
 *
 * Implements stale-while-revalidate pattern:
 * - Returns cached/fast data immediately
 * - Fetches full metadata in background
 * - Updates UI when full data is ready
 *
 * @returns Object containing loading state, data, and revalidate function
 */
export function useBrewInstalled() {
  const [fastData, setFastData] = useState<InstalledMap | undefined>(undefined);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const fastLoadAttempted = useRef(false);

  // Phase 1: Fast initial load (cache or brew list)
  useEffect(() => {
    if (fastLoadAttempted.current) return;
    fastLoadAttempted.current = true;

    const loadFast = async () => {
      try {
        const data = await brewFetchInstalledFast();
        if (data) {
          setFastData(data);
          brewLogger.log("Fast data loaded", {
            formulaeCount: data.formulae.size,
            casksCount: data.casks.size,
          });
        }
      } catch (err) {
        brewLogger.error("Fast load failed", { error: err });
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadFast();
  }, []);

  // Phase 2: Full metadata fetch (runs in background)
  const result = useCachedPromise(
    async (): Promise<InstalledMap | undefined> => {
      return await brewFetchInstalled(true);
    },
    [],
    {
      keepPreviousData: true,
      onError: async (error) => {
        brewLogger.error("Failed to fetch installed packages", {
          errorType: error.name,
          message: error.message,
          isLockError: isBrewLockError(error),
        });

        const isLock = isBrewLockError(error);
        const message = getErrorMessage(error);

        await showToast({
          style: Toast.Style.Failure,
          title: isLock ? "Brew is Busy" : "Failed to fetch installed packages",
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

  // Use fast data while full data is loading, then switch to full data
  const data = result.data ?? fastData;
  const isLoading = isInitialLoading || (result.isLoading && !data);

  return {
    ...result,
    data,
    isLoading,
  };
}
