/**
 * Hook for fetching installed brew packages.
 */

import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchInstalled, InstalledMap, isBrewLockError, getErrorMessage, brewLogger } from "../utils";

/**
 * Hook to fetch and cache installed brew packages.
 *
 * @returns Object containing loading state, data, and revalidate function
 */
export function useBrewInstalled() {
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

  return result;
}
