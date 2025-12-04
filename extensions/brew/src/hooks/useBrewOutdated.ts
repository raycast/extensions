/**
 * Hook for fetching outdated brew packages.
 */

import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchOutdated, OutdatedResults, isBrewLockError, getErrorMessage, brewLogger } from "../utils";
import { preferences } from "../utils";

/**
 * Hook to fetch and cache outdated brew packages.
 *
 * @returns Object containing loading state, data, and revalidate function
 */
export function useBrewOutdated() {
  const result = useCachedPromise(
    async (): Promise<OutdatedResults> => {
      return await brewFetchOutdated(preferences.greedyUpgrades);
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

  return result;
}
