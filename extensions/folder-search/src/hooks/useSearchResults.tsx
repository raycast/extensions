import { useState, useCallback, useRef, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { SpotlightSearchResult, SpotlightSearchPreferences } from "../types";
import { log, shouldShowPath, lastUsedSort, matchesSearchQuery } from "../utils";
import { searchSpotlight } from "../search-spotlight";

interface UseSearchResultsProps {
  initialText?: string;
  searchScope?: string;
  pinnedResults?: SpotlightSearchResult[];
}

/**
 * Hook for managing search results
 */
export function useSearchResults({
  initialText = "",
  searchScope = "",
  pinnedResults = [],
}: UseSearchResultsProps = {}) {
  const [searchText, setSearchText] = useState<string>(initialText);
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const abortable = useRef<AbortController>(new AbortController());

  // Handle search text changes
  useEffect(() => {
    if (searchScope === "pinned") {
      log("debug", "useSearchResults", "Filtering pinned results", {
        searchText,
        pinnedCount: pinnedResults.length,
      });

      setResults(pinnedResults.filter((pin) => matchesSearchQuery(pin.kMDItemFSName, searchText)));
      setIsQuerying(false);
      setHasSearched(true);
    } else if (searchText) {
      log("debug", "useSearchResults", "Starting search", {
        searchText,
        searchScope,
      });
      performSearch(searchText, searchScope);
    } else {
      // Clear results if search text is empty
      log("debug", "useSearchResults", "Clearing results - no search text", {
        searchScope,
      });
      setIsQuerying(false);
      setResults([]);
      setHasSearched(false);
    }
  }, [searchText, searchScope, pinnedResults]);

  // Perform spotlight search
  const performSearch = useCallback(async (search: string, scope: string) => {
    if (!search || scope === "pinned") return;

    try {
      log("debug", "useSearchResults", "Executing search", {
        search,
        scope,
      });

      // Cancel any ongoing searches
      if (abortable.current) {
        abortable.current.abort();
      }

      // Create a new abort controller
      abortable.current = new AbortController();

      // Start showing spinner but keep existing results visible
      setIsQuerying(true);
      // Don't clear results immediately - let them stay visible during search

      // Perform the search
      const searchResults = await searchSpotlight(search, scope as "pinned" | "user" | "all", abortable);

      log("debug", "useSearchResults", "Search completed", {
        resultCount: searchResults.length,
      });

      // Get preferences for filtering
      const { filterLibraryFolders } = getPreferenceValues<SpotlightSearchPreferences>();

      // Filter results based on preferences
      const filteredResults = searchResults.filter((result) => shouldShowPath(result.path, !filterLibraryFolders));

      log("debug", "useSearchResults", "Processing search results", {
        originalCount: searchResults.length,
        filteredCount: filteredResults.length,
        filterLibraryFolders,
      });

      // Update results state
      setResults(filteredResults.sort(lastUsedSort));
      setIsQuerying(false);
      setHasSearched(true);
    } catch (error) {
      // Ignore AbortError as it's expected during debouncing
      if (error instanceof Error && error.name === "AbortError") {
        log("debug", "useSearchResults", "Search aborted", { search });
        return;
      }

      log("error", "useSearchResults", "Search error", {
        error: error instanceof Error ? error.message : String(error),
        searchText: search,
        searchScope: scope,
      });

      if (error instanceof Error && error.name !== "AbortError") {
        showFailureToast(error, { title: "Error searching folders" });
      }

      setIsQuerying(false);
      setHasSearched(true);
    }
  }, []);

  // Clean up abort controller
  useEffect(() => {
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, []);

  return {
    searchText,
    setSearchText,
    results,
    isQuerying,
    hasSearched,
    performSearch,
  };
}
