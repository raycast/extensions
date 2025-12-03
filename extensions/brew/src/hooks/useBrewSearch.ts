/**
 * Hook for searching brew packages.
 */

import { useRef } from "react";
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
 */
export function useBrewSearch(options: UseBrewSearchOptions): UseBrewSearchResult {
  const { searchText, limit = 200, installed } = options;

  const latestInstalled = useRef(installed);
  latestInstalled.current = installed;

  const abortable = useRef<AbortController>(null);
  const { isLoading, data, mutate } = useCachedPromise(
    async (query: string) => {
      const results = await brewSearch(query, limit, abortable.current?.signal);
      updateInstalled(results, latestInstalled.current);
      return results;
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

  return {
    isLoading,
    data,
    mutate,
  };
}

/**
 * Update search results with installed status.
 */
export function updateInstalled(results?: InstallableResults, installed?: InstalledMap): void {
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
