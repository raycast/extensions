import { usePromise } from "@raycast/utils";
import { searchWithFd } from "../utils/fd";
import { getPreferenceValues } from "@raycast/api";
import { SearchMode } from "../types";
import { useState, useCallback, useEffect } from "react";
import { homedir } from "os";

export function useFdSearch(
  query: string,
  searchScope: string,
  searchMode: SearchMode,
) {
  const preferences = getPreferenceValues<Preferences>();
  const [manualTrigger, setManualTrigger] = useState(0);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Get search path
  const getSearchPath = (): string => {
    switch (searchScope) {
      case "all":
        return "/";
      case "home":
        return homedir();
      case "downloads":
        return `${homedir()}/Downloads`;
      case "documents":
        return `${homedir()}/Documents`;
      case "applications":
        return "/Applications";
      case "config":
        return "/etc,/opt";
      case "custom": {
        // For old format compatibility
        if (
          preferences.customSearchPaths &&
          !preferences.customSearchPaths.includes(":")
        ) {
          return preferences.customSearchPaths;
        }
        // For new format, return just the paths
        const customPaths = preferences.customSearchPaths || "";
        const paths = customPaths
          .split(",")
          .map((item) => {
            const [, path] = item.split(":");
            return path;
          })
          .filter(Boolean)
          .join(",");
        return paths || homedir();
      }
      default:
        // Handle custom-named paths
        if (searchScope.startsWith("custom-")) {
          const customPaths = preferences.customSearchPaths || "";
          const items = customPaths.split(",").map((item) => item.trim());
          const index = parseInt(searchScope.replace("custom-", ""));
          if (items[index]) {
            const [, path] = items[index].split(":");
            return path || homedir();
          }
        }
        return homedir();
    }
  };

  // Function to manually trigger search
  const triggerSearch = useCallback(() => {
    console.log(
      "Triggering fd search for:",
      query,
      "in scope:",
      searchScope,
      "mode:",
      searchMode,
    );
    setIsSearching(true);
    setLastSearchQuery(query);
    setManualTrigger((prev) => prev + 1);
    setHasSearchedOnce(true);
  }, [query, searchScope, searchMode]);

  const searchResult = usePromise(
    async (searchQuery: string, trigger: number) => {
      if (!searchQuery || searchQuery.trim().length < 2 || trigger === 0) {
        return [];
      }

      // Add brief delay to let user see search status
      await new Promise((resolve) => setTimeout(resolve, 100));

      const results = await searchWithFd(searchQuery, {
        maxDepth: parseInt(preferences.maxDepth),
        hidden: preferences.showHiddenFiles,
        exclude: preferences.excludePatterns
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        searchMode: searchMode,
        searchPath: getSearchPath(),
      });

      // Sort by modification time
      return results.sort(
        (a, b) => b.modifiedDate.getTime() - a.modifiedDate.getTime(),
      );
    },
    [lastSearchQuery, manualTrigger],
    {
      execute: manualTrigger > 0 && lastSearchQuery.length >= 2,
      onError: (error) => {
        console.error("fd search error:", error);
        setIsSearching(false);
      },
    },
  );

  // Monitor search completion status
  useEffect(() => {
    if (!searchResult.isLoading && isSearching) {
      console.log("Search completed, resetting isSearching");
      setIsSearching(false);
    }
  }, [searchResult.isLoading, isSearching]);

  const isReallyLoading = searchResult.isLoading || isSearching;

  return {
    ...searchResult,
    isLoading: isReallyLoading,
    triggerSearch,
    hasSearchedOnce,
    needsEnterToSearch:
      !hasSearchedOnce || !searchResult.data || searchResult.data.length === 0,
  };
}
