/**
 * Custom hook for app search logic
 */

import { useState, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { searchApps } from "../lib/apps/app-search";
import { SearchResults } from "../types";

interface UseAppSearchOptions {
  searchText: string;
  forceAI: boolean;
}

interface UseAppSearchReturn {
  results: SearchResults;
  isLoading: boolean;
  showAskAI: boolean;
}

export function useAppSearch({ searchText, forceAI }: UseAppSearchOptions): UseAppSearchReturn {
  const [results, setResults] = useState<SearchResults>({ installed: [], suggestions: [] });
  const [isLoading, setIsLoading] = useState(false);
  const searchIdRef = useRef(0);

  useEffect(() => {
    async function performSearch() {
      if (!searchText.trim()) {
        setResults({ installed: [], suggestions: [] });
        setIsLoading(false);
        return;
      }

      // Increment search ID for this new search
      searchIdRef.current += 1;
      const currentSearchId = searchIdRef.current;

      setIsLoading(true);
      try {
        // Use AI for queries longer than 3 characters, or if user explicitly requested it
        const useAI = searchText.trim().length > 3 || forceAI;
        const searchResults = await searchApps(searchText, true, useAI);

        // Only update results if this is still the latest search
        if (currentSearchId === searchIdRef.current) {
          setResults(searchResults);
        }
      } catch (error) {
        // Only show error if this is still the latest search
        if (currentSearchId === searchIdRef.current) {
          console.error("Search error:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: errorMessage,
          });
        }
      } finally {
        // Only clear loading if this is still the latest search
        if (currentSearchId === searchIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    // Debounce search - longer for AI queries
    const debounceTime = searchText.trim().length > 3 || forceAI ? 500 : 300;
    const timeoutId = setTimeout(performSearch, debounceTime);
    return () => clearTimeout(timeoutId);
  }, [searchText, forceAI]);

  // Determine if we should show "Ask AI" option
  // Show when: 1) short query (≤3 chars) OR 2) no results found
  const hasNoResults = results.installed.length === 0 && results.suggestions.length === 0;
  const showAskAI =
    searchText.trim().length > 0 && !forceAI && !isLoading && (searchText.trim().length <= 3 || hasNoResults);

  return {
    results,
    isLoading,
    showAskAI,
  };
}
