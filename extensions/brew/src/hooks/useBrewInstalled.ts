/**
 * Hook for fetching installed brew packages.
 *
 * Uses Raycast's useCachedPromise for caching with keepPreviousData
 * to show stale data while revalidating.
 */

import { useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  brewFetchInstalled,
  InstalledMap,
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
 * @returns Object containing loading state, data, and revalidate function
 */
// Debounce delay before showing loading toast (ms)
const LOADING_TOAST_DEBOUNCE_MS = 300;

export function useBrewInstalled() {
  const loadingToastRef = useRef<Toast | undefined>(undefined);
  const toastTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const shouldShowToastRef = useRef(false);

  const result = useCachedPromise(
    async (): Promise<InstalledMap | undefined> => {
      return await brewFetchInstalled(true);
    },
    [],
    {
      keepPreviousData: true,
      onWillExecute: () => {
        // Debounce the loading toast to avoid flashing on fast cache loads
        shouldShowToastRef.current = true;
        toastTimeoutRef.current = setTimeout(async () => {
          // Check flag in case data loaded before timeout fired
          if (shouldShowToastRef.current) {
            loadingToastRef.current = await showToast({
              style: Toast.Style.Animated,
              title: "Loading Installed Packages…",
            });
          }
        }, LOADING_TOAST_DEBOUNCE_MS);
      },
      onData: () => {
        shouldShowToastRef.current = false;
        clearTimeout(toastTimeoutRef.current);
        loadingToastRef.current?.hide();
      },
      onError: async (error) => {
        shouldShowToastRef.current = false;
        clearTimeout(toastTimeoutRef.current);
        loadingToastRef.current?.hide();
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

  return result;
}
