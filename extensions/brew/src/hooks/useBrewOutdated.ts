/**
 * Hook for fetching outdated brew packages.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { brewFetchOutdated, brewUpdate, OutdatedResults, isBrewLockError, brewLogger } from "../utils";
import { preferences, isOutdatedSnapshotDirty, clearOutdatedSnapshotDirty, outdatedFetchFailureCopy } from "../utils";

/**
 * Hook to fetch and cache outdated brew packages.
 *
 * Uses a two-phase fetch strategy for faster initial load:
 * 1. First, fetch outdated packages WITHOUT running brew update (fast, ~1s)
 * 2. Then, run brew update in background and refresh (slower, ~5-10s)
 *
 * This shows potentially stale data immediately, then updates with fresh data.
 *
 * @param options.backgroundRefresh - Set false to skip phase 2. The Upgrade
 * command must: its run engine issues its own `brew update` the moment data
 * arrives, and Homebrew refuses concurrent updates — the two processes would
 * race for the update lock and whichever loses errors out.
 * @returns Object containing loading state, data, isRefreshing flag, and revalidate function
 */
export function useBrewOutdated(options?: { backgroundRefresh?: boolean }) {
  const backgroundRefresh = options?.backgroundRefresh ?? true;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasRefreshedRef = useRef(false);
  const refreshAbortRef = useRef<AbortController | null>(null);
  // An upgrade run since the last fetch means the cached snapshot is known
  // stale — it still lists the packages that were just upgraded. Captured
  // once at mount: a run re-marking the flag mid-lifecycle must not blank a
  // list that is already showing fresh data.
  const [wasDirtyAtMount] = useState(() => isOutdatedSnapshotDirty());
  const hasFreshFetchRef = useRef(false);

  const result = useCachedPromise(
    async (): Promise<OutdatedResults> => {
      // On first load, skip update for speed
      // The background refresh will update the data
      const fresh = await brewFetchOutdated(preferences.greedyUpgrades, undefined, true);
      hasFreshFetchRef.current = true;
      clearOutdatedSnapshotDirty();
      return fresh;
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

        // With nothing cached (or only a cached empty result), the command
        // renders a full-screen failure view (OutdatedErrorView) with its own
        // Retry — a toast on top of it would just duplicate the message.
        // Toast only when cached packages are actually on screen and the
        // toast is the sole failure signal — a withheld dirty snapshot is
        // not on screen, so it gets the full-screen view, not a toast.
        const withheld = wasDirtyAtMount && !hasFreshFetchRef.current;
        const hasCachedPackages =
          !withheld && result.data !== undefined && (result.data.formulae.length > 0 || result.data.casks.length > 0);
        if (!hasCachedPackages) return;

        const copy = outdatedFetchFailureCopy(error);

        await showToast({
          style: Toast.Style.Failure,
          title: copy.title,
          message: copy.message,
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

  // Background refresh: run brew update then fetch fresh outdated data
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshInBackground = useCallback(() => {
    if (hasRefreshedRef.current || result.isLoading) return;
    hasRefreshedRef.current = true;
    setIsRefreshing(true);
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    brewLogger.log("Starting background refresh for outdated packages");

    // Tracked so cancelRefresh can await the actual process exit — an
    // aborted `brew update` may hold Homebrew's lock for a moment after the
    // signal flips, and a run started before it dies loses the lock race.
    refreshPromiseRef.current = (async () => {
      try {
        // Run brew update (loading indicator is shown via isRefreshing)
        await brewUpdate(controller.signal);

        // Then fetch fresh outdated data (skipUpdate since we just did it)
        const freshData = await brewFetchOutdated(preferences.greedyUpgrades, controller.signal, true);

        // Only update if we got different results
        if (
          freshData.formulae.length !== result.data?.formulae.length ||
          freshData.casks.length !== result.data?.casks.length
        ) {
          brewLogger.log("Background refresh found changes", {
            oldFormulae: result.data?.formulae.length ?? 0,
            newFormulae: freshData.formulae.length,
            oldCasks: result.data?.casks.length ?? 0,
            newCasks: freshData.casks.length,
          });
          // Trigger a revalidate to update the UI with fresh data
          result.revalidate();
        } else {
          brewLogger.log("Background refresh complete, no changes");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          brewLogger.log("Background refresh cancelled");
        } else {
          brewLogger.warn("Background refresh failed", { error });
        }
      } finally {
        refreshAbortRef.current = null;
        refreshPromiseRef.current = null;
        setIsRefreshing(false);
      }
    })();
  }, [result]);

  // Abort an in-flight background refresh and wait for its process to exit.
  // Show Upgrades awaits this before starting a run: the run engine issues
  // its own `brew update`, Homebrew refuses concurrent updates, and the
  // aborted update may hold the lock for a moment after the signal flips.
  const cancelRefresh = useCallback(async () => {
    refreshAbortRef.current?.abort();
    await refreshPromiseRef.current;
  }, []);

  // Start background refresh after initial data loads. Not on a failed or
  // withheld initial fetch: internally cached data still exists then, but the
  // screen is showing the failure view (or nothing) — kicking off a long
  // `brew update` would bury that behind a checking spinner; Retry is the
  // recovery path instead.
  useEffect(() => {
    const withholding = wasDirtyAtMount && !hasFreshFetchRef.current;
    if (
      backgroundRefresh &&
      !result.isLoading &&
      result.data &&
      !result.error &&
      !withholding &&
      !hasRefreshedRef.current
    ) {
      refreshInBackground();
    }
  }, [backgroundRefresh, result.isLoading, result.data, result.error, wasDirtyAtMount, refreshInBackground]);

  // Abort an in-flight background `brew update` when the command unmounts —
  // left running, it can race the next command's own update for Homebrew's
  // update lock.
  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort();
    };
  }, []);

  // Withhold a known-stale snapshot until a fresh fetch has landed — painting
  // the pre-run list and then swapping it out reads as a glitch. Gating on
  // the fetch (not on isLoading) keeps the stale list withheld even when that
  // fetch fails: the loading placeholder and the error view are honest; the
  // stale list is not.
  const withholding = wasDirtyAtMount && !hasFreshFetchRef.current;
  return {
    ...result,
    data: withholding ? undefined : result.data,
    // While withholding with no failure yet, the commands must read as
    // loading — data alone being undefined would render neither rows, nor an
    // empty state, nor an error.
    isLoading: result.isLoading || (withholding && !result.error),
    isRefreshing,
    cancelRefresh,
  };
}
