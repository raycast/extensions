/**
 * Hook for loading Homebrew's bulk install rankings, which back the
 * popularity sort in the search view.
 */

import { useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchPopularityRanks, hasPopularityCache, PopularityRanks, showBrewFailureToast } from "../utils";

interface UsePopularityRanksResult {
  isLoading: boolean;
  /** Undefined until the rankings have loaded, or if loading failed. */
  data: PopularityRanks | undefined;
  /** Re-run the load. Needed after Clear Cache deletes the files underneath it. */
  revalidate: () => void;
}

/**
 * Load install rankings for every formula and cask (~3MB, disk-cached).
 *
 * Only runs when `enabled`, so the download is paid for by users who actually
 * turn on the popularity sort. The first load shows a progress toast: it is a
 * multi-second download and a silent list is indistinguishable from a stall.
 */
export function usePopularityRanks(enabled: boolean): UsePopularityRanksResult {
  const toastRef = useRef<Toast | undefined>(undefined);

  // usePromise, NOT useCachedPromise: the latter persists `data` through
  // JSON.stringify, which turns these Maps into `{}` — a second launch would
  // hand the sort a plain object and `.get()` would throw. Persistence buys
  // nothing here anyway; the ~3MB files are already cached on disk.
  const { isLoading, data, revalidate } = usePromise(
    async () => {
      // Only announce a cold load. A warm one is a disk read plus a HEAD
      // request, and a toast that flashes for 50ms is noise.
      if (!(await hasPopularityCache())) {
        toastRef.current = await showToast({
          style: Toast.Style.Animated,
          title: "Downloading Install Statistics",
          message: "0%",
        });
      }

      // The formula and cask files download concurrently and each reports its
      // own percentage, so show their mean rather than letting the toast jump
      // between two unrelated numbers.
      const percentByURL = new Map<string, number>();

      try {
        return await fetchPopularityRanks((progress) => {
          if (!toastRef.current || progress.percent < 0) {
            return;
          }
          percentByURL.set(progress.url, progress.percent);
          const percents = [...percentByURL.values()];
          const combined = percents.reduce((sum, percent) => sum + percent, 0) / percents.length;
          toastRef.current.message = `${Math.round(combined)}%`;
        });
      } finally {
        await toastRef.current?.hide();
        toastRef.current = undefined;
      }
    },
    [],
    {
      execute: enabled,
      onError: async (error) => {
        await showBrewFailureToast("Could Not Load Install Statistics", error);
      },
    },
  );

  return { isLoading: enabled && isLoading, data, revalidate };
}
