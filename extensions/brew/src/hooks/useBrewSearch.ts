/**
 * Hook for searching brew packages.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise, MutatePromise } from "@raycast/utils";
import {
  brewSearch,
  InstallableResults,
  InstalledMap,
  Cask,
  Formula,
  isBrewLockError,
  getErrorMessage,
  searchLogger,
  SearchDownloadProgress,
  DownloadProgress,
} from "../utils";

interface UseBrewSearchOptions {
  searchText: string;
  limit?: number;
  installed?: InstalledMap;
}

/** Download progress for a single file */
export interface FileDownloadProgress {
  /** Whether download has started */
  started: boolean;
  /** Whether download is complete */
  complete: boolean;
  /** Bytes downloaded so far */
  bytesDownloaded: number;
  /** Total bytes (0 if unknown) */
  totalBytes: number;
  /** Percentage (0-100, or -1 if unknown) */
  percent: number;
  /** Number of items processed so far (during processing phase) */
  itemsProcessed: number;
  /** Total number of items (known after processing completes) */
  totalItems: number;
}

/** Overall loading state for the search */
export interface SearchLoadingState {
  /** Whether we're currently loading */
  isLoading: boolean;
  /** Whether this is the initial load (never had data) */
  isInitialLoad: boolean;
  /** Current loading phase */
  phase: "casks" | "formulae" | "parsing" | "complete";
  /** Casks download progress */
  casksProgress: FileDownloadProgress;
  /** Formulae download progress */
  formulaeProgress: FileDownloadProgress;
}

interface UseBrewSearchResult {
  isLoading: boolean;
  isInitialLoad: boolean;
  loadingState: SearchLoadingState;
  data: InstallableResults | undefined;
  mutate: MutatePromise<InstallableResults | undefined>;
}

/** Default progress state for a file */
const defaultFileProgress: FileDownloadProgress = {
  started: false,
  complete: false,
  bytesDownloaded: 0,
  totalBytes: 0,
  percent: 0,
  itemsProcessed: 0,
  totalItems: 0,
};

/**
 * Hook to search brew packages with caching and abort support.
 *
 * Uses a two-layer approach to handle the race condition between search results
 * and installed data:
 * 1. Search results are fetched and cached without installed status
 * 2. Installed status is applied via useMemo when either search results or
 *    installed data changes, ensuring we always have the latest combination
 */
export function useBrewSearch(options: UseBrewSearchOptions): UseBrewSearchResult {
  const { searchText, limit = 200, installed } = options;

  // Track if we've ever received data (for initial load detection)
  const hasEverLoadedRef = useRef(false);

  // Track download progress for each file
  const [downloadProgress, setDownloadProgress] = useState<SearchDownloadProgress>({
    phase: "casks",
  });

  const abortable = useRef<AbortController>(null);
  const {
    isLoading: isLoadingFromHook,
    data: rawData,
    mutate,
  } = useCachedPromise(
    async (query: string) => {
      searchLogger.log("Starting search", { query, isInitialLoad: !hasEverLoadedRef.current });

      // Reset progress at start
      setDownloadProgress({ phase: "casks" });

      // Fetch search results with progress tracking
      const result = await brewSearch(query, limit, abortable.current?.signal, (progress) => {
        setDownloadProgress(progress);
      });

      // brewSearch reports phase: "complete" with final totals via onProgress
      return result;
    },
    [searchText],
    {
      abortable,
      keepPreviousData: true,
      onError: async (error) => {
        // Don't show toast for abort errors (user typing)
        if (error.name === "AbortError") {
          return;
        }

        searchLogger.error("Search failed", {
          errorType: error.name,
          message: error.message,
          isLockError: isBrewLockError(error),
        });

        const isLock = isBrewLockError(error);
        const message = getErrorMessage(error);

        await showToast({
          style: Toast.Style.Failure,
          title: isLock ? "Brew is Busy" : "Search failed",
          message: isLock ? "Another brew process is running. Please wait and try again." : message,
        });
      },
    },
  );

  // Track when we first receive data
  useEffect(() => {
    if (rawData && !hasEverLoadedRef.current) {
      searchLogger.log("Initial data loaded", {
        formulaeCount: rawData.formulae.length,
        casksCount: rawData.casks.length,
      });
      hasEverLoadedRef.current = true;
    }
  }, [rawData]);

  // Apply installed status to search results whenever either changes
  const data = useMemo(() => {
    if (!rawData) return undefined;

    // Create a shallow copy to avoid mutating cached data
    const formulae = rawData.formulae.map((f) => ({ ...f }));
    const casks = rawData.casks.map((c) => ({ ...c }));

    // Preserve totalLength from original arrays (set before slicing to limit)
    formulae.totalLength = rawData.formulae.totalLength;
    casks.totalLength = rawData.casks.totalLength;

    const results: InstallableResults = { formulae, casks };

    applyInstalledStatus(results, installed);
    return results;
  }, [rawData, installed]);

  // isInitialLoad is true when we haven't received data yet
  const isInitialLoad = !hasEverLoadedRef.current && !rawData;

  // Compute isLoading - true if hook says loading OR if we're in initial load state
  const isLoading = isLoadingFromHook || isInitialLoad;

  // Convert DownloadProgress to FileDownloadProgress
  const toFileProgress = (dp?: DownloadProgress): FileDownloadProgress => {
    if (!dp) return defaultFileProgress;
    return {
      started: true,
      complete: dp.complete,
      bytesDownloaded: dp.bytesDownloaded,
      totalBytes: dp.totalBytes,
      percent: dp.percent,
      itemsProcessed: dp.itemsProcessed ?? 0,
      totalItems: dp.totalItems ?? 0,
    };
  };

  // Build loading state object for UI
  const loadingState: SearchLoadingState = useMemo(() => {
    const casksProgress = toFileProgress(downloadProgress.casksProgress);
    const formulaeProgress = toFileProgress(downloadProgress.formulaeProgress);

    // Mark casks as started (we always start with casks now)
    casksProgress.started = true;

    // Mark formulae as started if we're in formulae phase or later
    if (
      downloadProgress.phase === "formulae" ||
      downloadProgress.phase === "parsing" ||
      downloadProgress.phase === "complete"
    ) {
      formulaeProgress.started = true;
    }

    // IMPORTANT: Only mark as "complete" when the phase has moved PAST that step
    // This ensures we show "Parsing..." during the long parsing phase after download
    // The download callback reports complete:true when download finishes, but parsing
    // can take 30+ seconds after that.

    // Casks is only truly complete when we've moved to formulae phase or later
    if (
      downloadProgress.phase === "formulae" ||
      downloadProgress.phase === "parsing" ||
      downloadProgress.phase === "complete"
    ) {
      casksProgress.complete = true;
      casksProgress.percent = 100;
    } else {
      // Still in casks phase - don't mark as complete even if download says so
      // This allows UI to show "Parsing..." state
      casksProgress.complete = false;
    }

    // Formulae is only truly complete when we've moved to parsing or complete phase
    if (downloadProgress.phase === "parsing" || downloadProgress.phase === "complete") {
      formulaeProgress.complete = true;
      formulaeProgress.percent = 100;
    } else if (downloadProgress.phase === "formulae") {
      // Still in formulae phase - don't mark as complete even if download says so
      formulaeProgress.complete = false;
    }

    return {
      isLoading,
      isInitialLoad,
      phase: downloadProgress.phase,
      casksProgress,
      formulaeProgress,
    };
  }, [isLoading, isInitialLoad, downloadProgress]);

  return {
    isLoading,
    isInitialLoad,
    loadingState,
    data,
    mutate,
  };
}

/**
 * Apply installed status to search results.
 * Mutates the results in place.
 */
function applyInstalledStatus(results: InstallableResults, installed?: InstalledMap): void {
  if (!results || !installed) {
    return;
  }

  for (const formula of results.formulae) {
    const info = installed.formulae instanceof Map ? installed.formulae.get(formula.name) : undefined;
    if (info && isFormula(info)) {
      formula.installed = info.installed;
      formula.outdated = info.outdated;
      formula.pinned = info.pinned;
    } else {
      formula.installed = [];
      formula.outdated = false;
      formula.pinned = false;
    }
  }

  for (const cask of results.casks) {
    const info = installed.casks instanceof Map ? installed.casks.get(cask.token) : undefined;
    if (info && isCask(info)) {
      cask.installed = info.installed;
      cask.outdated = info.outdated;
    } else {
      cask.installed = undefined;
      cask.outdated = false;
    }
  }
}

type Installable = Cask | Formula;

function isCask(installable: Installable): installable is Cask {
  return (installable as Cask).token != undefined;
}

function isFormula(installable: Installable): installable is Formula {
  return (installable as Formula).pinned != undefined;
}

/**
 * Check if a package is installed by name.
 */
export function isInstalled(name: string, installed?: InstalledMap): boolean {
  if (!installed) {
    return false;
  }
  return (
    (installed.formulae instanceof Map && installed.formulae.get(name) != undefined) ||
    (installed.casks instanceof Map && installed.casks.get(name) != undefined)
  );
}
