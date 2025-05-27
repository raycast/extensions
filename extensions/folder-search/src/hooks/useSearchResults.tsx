import { useState, useCallback, useRef, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { SpotlightSearchResult, SpotlightSearchPreferences } from "../types";
import { log, shouldShowPath, lastUsedSort } from "../utils";
import { searchSpotlight } from "../search-spotlight";
import { useSearchDebounce } from "./useSearchDebounce";

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
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const abortable = useRef<AbortController>(new AbortController());

  // Use the debounce hook
  const { searchText, debouncedText, setSearchText } = useSearchDebounce({
    initialText,
    onDebounced: (text) => handleDebouncedSearch(text),
  });

  // Handle debounced search text changes
  const handleDebouncedSearch = useCallback(
    (text: string) => {
      if (searchScope === "pinned") {
        log("debug", "useSearchResults", "Filtering pinned results", {
          searchText: text,
          pinnedCount: pinnedResults.length,
        });

        setResults(
          pinnedResults.filter((pin) =>
            pin.kMDItemFSName.toLocaleLowerCase().includes(text.replace(/[[|\]]/gi, "").toLocaleLowerCase()),
          ),
        );
        setIsQuerying(false);
        setHasSearched(true);
      } else if (text) {
        log("debug", "useSearchResults", "Starting search", {
          searchText: text,
          searchScope,
        });
        performSearch(text, searchScope);
      } else {
        // Clear results if search text is empty
        log("debug", "useSearchResults", "Clearing results - no search text", {
          searchScope,
        });
        setIsQuerying(false);
        setResults([]);
        setHasSearched(false);
      }
    },
    [searchScope, pinnedResults],
  );

  // Re-apply filtering when pinned results change
  useEffect(() => {
    if (searchScope === "pinned" && debouncedText) {
      log("debug", "useSearchResults", "Re-filtering pinned results after change", {
        searchText: debouncedText,
        pinnedCount: pinnedResults.length,
      });

      setResults(
        pinnedResults.filter((pin) =>
          pin.kMDItemFSName.toLocaleLowerCase().includes(debouncedText.replace(/[[|\]]/gi, "").toLocaleLowerCase()),
        ),
      );
    }
  }, [pinnedResults, searchScope, debouncedText]);

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

      // Start showing spinner
      setIsQuerying(true);
      setResults([]);

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
    results:
      searchScope === "pinned"
        ? pinnedResults.filter(
            (pin) =>
              !searchText ||
              pin.kMDItemFSName.toLocaleLowerCase().includes(searchText.replace(/[[|\]]/gi, "").toLocaleLowerCase()),
          )
        : results,
    isQuerying,
    hasSearched,
    performSearch,
  };
}
