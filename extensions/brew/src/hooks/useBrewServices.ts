/**
 * Hook for fetching brew services.
 */

import { environment, LaunchType, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchServices, Service, isBrewLockError, getErrorMessage, fetchLogger, copyLogsAction } from "../utils";

/**
 * Hook to fetch and cache brew services.
 *
 * Fetch failures show a toast, except in a background launch (the menu bar's
 * interval refresh), where the toast API is unavailable; callers that can run
 * in the background should render `error` themselves.
 *
 * @returns Object containing loading state, data, error, and a revalidate function.
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

        // The Services menu bar refreshes on its `interval` as a background
        // launch, where Raycast rejects the toast API outright ("Toast API is
        // not available when command is launched in background"). The menu
        // reports the failure itself via the returned `error`.
        if (environment.launchType === LaunchType.Background) {
          return;
        }

        const isLock = isBrewLockError(error);
        const message = getErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: isLock ? "Brew is Busy" : "Failed to fetch services",
          message: isLock ? "Another brew process is running. Please wait and try again." : message,
          primaryAction: copyLogsAction(message, { hideToast: true }),
        });
      },
    },
  );
}
