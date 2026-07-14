/**
 * The package index as React state: cached data instantly, freshness via
 * cheap polling of the index file's revision. Refresh policy: the catalog
 * follows the TTL preference; mutable slices refresh when older than 10
 * minutes; nothing refreshes while a mutation runs — the runner refreshes
 * for us.
 *
 * Views that don't render the catalog (Installed/Upgradable) pass
 * needsCatalog: false — they become usable after the fast mutable stage and
 * the catalog fills in behind them (it still feeds name repair and Search).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { showToast, Toast } from "@raycast/api";

import { isWingetAvailable } from "../cli/commands";
import { indexMtime, isCatalogFresh, loadIndex, migrateLegacyIndex, type PackageIndex } from "../core/index-store";
import { DEFAULT_ENV } from "../core/lock";
import { supportPath } from "../core/paths";
import { getCatalogValidityMs } from "../core/prefs";
import { MUTABLE_STALENESS_MS, rebuildFullIndex, refreshMutableSlices } from "../core/refresh";
import { getIndexPaths } from "../core/runner";

const TICK_MS = 1_000;

interface UseIndexOptions {
  /** False for views that only render the mutable slices (Installed/Upgradable). */
  needsCatalog?: boolean;
}

interface UseIndexResult {
  index: PackageIndex | null;
  isLoading: boolean;
  /** A background catalog/mutable refresh is in flight. */
  isRefreshing: boolean;
  wingetAvailable: boolean | null;
  /** Manual "Update Index": full staged rebuild with toast feedback. */
  updateIndex: () => Promise<void>;
}

function useIndex(options: UseIndexOptions = {}): UseIndexResult {
  const needsCatalog = options.needsCatalog ?? true;
  const paths = getIndexPaths();
  const [index, setIndex] = useState<PackageIndex | null>(() => {
    try {
      migrateLegacyIndex(paths, DEFAULT_ENV, supportPath("legacyIndex"));
      return loadIndex(paths);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wingetAvailable, setWingetAvailable] = useState<boolean | null>(null);
  const lastMtimeRef = useRef<number | null>(indexMtime(paths));
  const refreshingRef = useRef(false);

  // Reload when any writer (runner, another refresher) bumps the file.
  useEffect(() => {
    const timer = setInterval(() => {
      const mtime = indexMtime(paths);
      if (mtime !== lastMtimeRef.current) {
        lastMtimeRef.current = mtime;
        setIndex(loadIndex(paths));
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const runRefresh = useCallback(async (mode: "full" | "mutable" | "cold", runOptions: { manual?: boolean } = {}) => {
    if (refreshingRef.current) {
      return;
    }
    refreshingRef.current = true;
    setIsRefreshing(true);
    const toast =
      mode === "mutable"
        ? null
        : await showToast({
            style: Toast.Style.Animated,
            title: mode === "cold" ? "Building package index…" : "Updating package index…",
            message: mode === "cold" ? "First run takes a minute" : undefined,
          });
    try {
      const stillStale = () => {
        const current = loadIndex(paths);
        if (mode === "mutable") {
          return !current || current.mutableAt === null || Date.now() - current.mutableAt > MUTABLE_STALENESS_MS;
        }
        return !isCatalogFresh(current, getCatalogValidityMs(), Date.now());
      };
      const outcome =
        mode === "mutable" ? await refreshMutableSlices(paths, stillStale) : await rebuildFullIndex(paths, stillStale);
      if (outcome === "failed") {
        throw new Error("WinGet returned an implausibly small catalog");
      }
      if (toast) {
        if (outcome === "refreshed" || outcome === "refreshed-elsewhere") {
          toast.style = Toast.Style.Success;
          toast.title = "Package index updated";
          toast.message = undefined;
        } else if (runOptions.manual) {
          // A manual refresh must never silently no-op.
          toast.style = Toast.Style.Failure;
          toast.title =
            outcome === "skipped-busy"
              ? "An operation is running and will refresh the index itself"
              : "Another index refresh is already running";
          toast.message = undefined;
        } else {
          await toast.hide();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update package index";
        toast.message = message;
        toast.primaryAction = {
          title: "Retry",
          onAction: () => void runRefresh(mode, runOptions),
        };
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to refresh package data",
          message,
        });
      }
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // Mount policy: availability check, then per-view refresh strategy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await isWingetAvailable();
      if (cancelled) return;
      setWingetAvailable(available);
      setIsLoading(false);
      if (!available) return;

      const current = loadIndex(paths);
      const now = Date.now();
      const catalogStale = !isCatalogFresh(current, getCatalogValidityMs(), now);
      const mutableStale = !current || current.mutableAt === null || now - current.mutableAt > MUTABLE_STALENESS_MS;

      if (needsCatalog) {
        if (catalogStale) {
          await runRefresh(current && current.packages.length > 0 ? "full" : "cold");
        } else if (mutableStale) {
          await runRefresh("mutable");
        }
      } else {
        // Mutable-first for Installed/Upgradable; the catalog (name repair,
        // Search) follows in the background only when it needs rebuilding.
        if (mutableStale) {
          await runRefresh("mutable");
        }
        if (!cancelled && catalogStale) {
          await runRefresh("full");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateIndex = useCallback(() => runRefresh("full", { manual: true }), [runRefresh]);

  return { index, isLoading, isRefreshing, wingetAvailable, updateIndex };
}

export { useIndex, type UseIndexOptions, type UseIndexResult };
