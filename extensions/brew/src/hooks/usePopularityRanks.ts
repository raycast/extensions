/**
 * Hook for loading Homebrew's bulk install rankings, which back the
 * popularity sort in the search view.
 */

import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchPopularityRanks, PopularityRanks, showBrewFailureToast } from "../utils";

interface UsePopularityRanksResult {
  isLoading: boolean;
  /** Undefined until the rankings have loaded, or if loading failed. */
  data: PopularityRanks | undefined;
  /** Re-run the load. Needed after Clear Cache deletes the files underneath it. */
  revalidate: () => void;
}

/**
 * Load install rankings for every formula and cask (~2.6MB, disk-cached).
 *
 * Only runs when `enabled`, so the download is paid for by users who actually
 * turn on the popularity sort.
 */
export function usePopularityRanks(enabled: boolean): UsePopularityRanksResult {
  // usePromise, NOT useCachedPromise: the latter persists `data` through
  // JSON.stringify, which turns these Maps into `{}` — a second launch would
  // hand the sort a plain object and `.get()` would throw. Persistence buys
  // nothing here anyway; the files are already cached on disk.
  const { isLoading, data, revalidate } = usePromise(
    async () => {
      // The toast is created by the first progress report, which only fires
      // when bytes are actually moving — so a warm cache stays silent, and a
      // stale-cache refresh (also a multi-second download) is announced too.
      // `??=` assigns the promise synchronously, so two concurrent callbacks
      // cannot each create a toast.
      let toast: Promise<Toast> | undefined;

      // Both files download concurrently and each reports its own percentage,
      // so show their mean rather than letting the toast jump between two
      // unrelated numbers.
      const percentByURL = new Map<string, number>();

      try {
        return await fetchPopularityRanks((progress) => {
          if (progress.percent < 0) {
            return;
          }
          percentByURL.set(progress.url, progress.percent);
          const percents = [...percentByURL.values()];
          const combined = percents.reduce((sum, percent) => sum + percent, 0) / percents.length;

          toast ??= showToast({ style: Toast.Style.Animated, title: "Downloading Install Statistics" });
          toast.then((t) => (t.message = `${Math.round(combined)}%`));
        });
      } finally {
        await toast?.then((t) => t.hide());
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
