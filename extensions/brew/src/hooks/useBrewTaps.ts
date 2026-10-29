/**
 * Hook for fetching installed taps and everything they provide.
 */

import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  brewFetchTapPackages,
  brewFetchTaps,
  type InstallableResults,
  type TapStatus,
  isBrewLockError,
  getErrorMessage,
  fetchLogger,
  copyLogsAction,
} from "../utils";

export interface TapsWithPackages {
  taps: TapStatus[];
  /**
   * Full `brew info` records for every tap's formulae and casks, and the
   * qualified names brew could not load. `unavailable` is absent from a value
   * cached before it existed; read it with `?? []`.
   */
  packages: InstallableResults & { unavailable?: string[] };
}

/**
 * Taps first, then one pair of `brew info` calls for all their packages. The
 * value is plain arrays, so it survives useCachedPromise's JSON cache and the
 * list paints from it on the next launch.
 */
export function useBrewTaps() {
  return useCachedPromise(
    async (): Promise<TapsWithPackages> => {
      const taps = await brewFetchTaps();
      return { taps, packages: await brewFetchTapPackages(taps) };
    },
    [],
    {
      keepPreviousData: true,
      onError: async (error) => {
        fetchLogger.error("Failed to fetch taps", { errorType: error.name, message: error.message });
        const isLock = isBrewLockError(error);
        const message = getErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: isLock ? "Brew is Busy" : "Failed to fetch taps",
          message: isLock ? "Another brew process is running. Please wait and try again." : message,
          primaryAction: copyLogsAction(message, { hideToast: true }),
        });
      },
    },
  );
}
