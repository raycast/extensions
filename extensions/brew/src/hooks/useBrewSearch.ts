/**
 * Hook for searching brew packages.
 */

import { useMemo, useRef } from "react";
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
} from "../utils";

interface UseBrewSearchOptions {
  searchText: string;
  limit?: number;
  installed?: InstalledMap;
}

interface UseBrewSearchResult {
  isLoading: boolean;
  data: InstallableResults | undefined;
  mutate: MutatePromise<InstallableResults | undefined>;
}

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

  const abortable = useRef<AbortController>(null);
  const {
    isLoading,
    data: rawData,
    mutate,
  } = useCachedPromise(
    async (query: string) => {
      // Fetch search results without installed status
      // Installed status will be applied separately via useMemo
      return await brewSearch(query, limit, abortable.current?.signal);
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

  // Apply installed status to search results whenever either changes
  // This ensures we always have the latest installed data, even if it
  // arrives after the search completes
  const data = useMemo(() => {
    if (!rawData) return undefined;

    // Create a shallow copy to avoid mutating cached data
    const results: InstallableResults = {
      formulae: rawData.formulae.map((f) => ({ ...f })),
      casks: rawData.casks.map((c) => ({ ...c })),
    };

    applyInstalledStatus(results, installed);
    return results;
  }, [rawData, installed]);

  return {
    isLoading,
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
