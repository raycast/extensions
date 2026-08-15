/**
 * Hook for fetching brew services.
 */

import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchServices, Service, isBrewLockError, getErrorMessage, fetchLogger } from "../utils";

/**
 * Hook to fetch and cache brew services.
 *
 * @returns Object containing loading state, data, and a revalidate function.
 */
export function useBrewServices() {
  return useCachedPromise(
    async (): Promise<Service[]> => {
      return await brewFetchServices();
    },
    [],
    {
      keepPreviousData: true,
      onError: async (error) => {
        fetchLogger.error("Failed to fetch services", {
          errorType: error.name,
          message: error.message,
          isLockError: isBrewLockError(error),
        });

        const isLock = isBrewLockError(error);
        await showToast({
          style: Toast.Style.Failure,
          title: isLock ? "Brew is Busy" : "Failed to fetch services",
          message: isLock ? "Another brew process is running. Please wait and try again." : getErrorMessage(error),
        });
      },
    },
  );
}
