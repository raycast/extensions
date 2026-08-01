/**
 * Hook for fetching installed brew packages.
 *
 * Uses Raycast's useCachedPromise for caching with keepPreviousData
 * to show stale data while revalidating.
 */

import { useMemo } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  brewFetchInstallableResults,
  brewMapInstalled,
  asInstallableResults,
  InstallableResults,
  isBrewLockError,
  getErrorMessage,
  brewLogger,
} from "../utils";

/**
 * Hook to fetch and cache installed brew packages.
 *
 * Uses useCachedPromise with keepPreviousData to implement stale-while-revalidate:
 * - Shows cached data immediately if available
 * - Fetches fresh data in background
 * - Loading state is true until data is available
 *
 * The cached value is the serialisable `InstallableResults` rather than the
 * `InstalledMap` consumers want: useCachedPromise persists through a JSON
 * cache, and `JSON.stringify(new Map())` is `{}`, so caching the mapped form
 * loses every package. The lookup maps are rebuilt on read instead.
 *
 * @returns Object containing loading state, data, and revalidate function
 */
export function useBrewInstalled() {
  const result = useCachedPromise(
    async (): Promise<InstallableResults | undefined> => {
      return await brewFetchInstallableResults(true);
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

  // Rebuild the name-keyed lookups on every change of the cached value. An
  // entry written by an earlier version of the extension holds `{}` in place
  // of each Map, which asInstallableResults rejects so the stale value is
  // re-fetched rather than rendered as an empty list.
  const data = useMemo(() => brewMapInstalled(asInstallableResults(result.data)), [result.data]);

  return { ...result, data };
}
