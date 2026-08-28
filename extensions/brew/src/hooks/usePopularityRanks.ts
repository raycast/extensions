/**
 * Hook for loading Homebrew's bulk install rankings, which back the
 * popularity sort in the search view.
 */

import { useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchPopularityRanks, fetchLogger, PopularityRanks, showBrewFailureToast } from "../utils";

interface UsePopularityRanksResult {
  isLoading: boolean;
  /** Undefined until the rankings have loaded, or if loading failed. */
  data: PopularityRanks | undefined;
  /** Re-run the load. Needed after Clear Cache deletes the files underneath it. */
  revalidate: () => void;
  /**
   * Increments on every successful load. Callers that cache against the ranks
   * must key on this, not on whether ranks merely exist — a refresh replaces
   * the maps without changing that they are present.
   */
  version: number;
}

/**
 * Load install rankings for every formula and cask (~2.6MB, disk-cached).
 *
 * Only runs when `enabled`, so the download is paid for by users who actually
 * turn on the popularity sort.
 */
export function usePopularityRanks(enabled: boolean): UsePopularityRanksResult {
  // Without this, turning the sort off (or leaving the view) mid-download lets
  // both ~1.3MB files run to completion with the toast still spinning.
  const abortable = useRef<AbortController>(null);
  const versionRef = useRef(0);

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
        const ranks = await fetchPopularityRanks((progress) => {
          if (progress.percent < 0) {
            return;
          }
          percentByURL.set(progress.url, progress.percent);
          const percents = [...percentByURL.values()];
          const combined = percents.reduce((sum, percent) => sum + percent, 0) / percents.length;

          toast ??= showToast({ style: Toast.Style.Animated, title: "Downloading Install Statistics" });
          // Detached on purpose — a progress callback cannot await. A failing
          // toast must not take down the download, and must not surface as an
          // unhandled rejection, so it is logged rather than thrown or dropped.
          toast.then((t) => (t.message = `${Math.round(combined)}%`)).catch(logToastFailure);
        }, abortable.current?.signal);
        versionRef.current += 1;
        return ranks;
      } finally {
        // Logged, not swallowed: a toast that fails to hide after a SUCCESSFUL
        // download has no other reporting path — the awaited chain above only
        // carries download failures.
        await toast?.then((t) => t.hide()).catch(logToastFailure);
      }
    },
    [],
    {
      abortable,
      execute: enabled,
      onError: async (error) => {
        await showBrewFailureToast("Could Not Load Install Statistics", error);
      },
    },
  );

  return { isLoading: enabled && isLoading, data, revalidate, version: versionRef.current };
}

function logToastFailure(error: unknown): void {
  fetchLogger.error("Install statistics toast failed", {
    error: error instanceof Error ? error.message : String(error),
  });
}
