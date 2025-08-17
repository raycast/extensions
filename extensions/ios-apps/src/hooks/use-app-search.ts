import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { debounce } from "lodash";
import type { AppDetails } from "../types";
import { searchITunesApps, convertITunesResultToAppDetails } from "../utils/itunes-api";

interface UseAppSearchResult {
  apps: AppDetails[];
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  searchText: string;
  setSearchText: (text: string) => void;
}

/**
 * Hook for searching apps with debounced input
 * @param initialSearchText Initial search text
 * @param debounceMs Debounce time in milliseconds
 * @returns Object with search results and state
 */
export function useAppSearch(initialSearchText = "", debounceMs = 500): UseAppSearchResult {
  const [searchText, setSearchText] = useState(initialSearchText);
  const [isLoading, setIsLoading] = useState(false);
  const [apps, setApps] = useState<AppDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);

  // Handle search errors
  const handleSearchError = (err: unknown) => {
    let errorMessage = "An unknown error occurred";
    if (err instanceof Error) {
      errorMessage = err.message;
      process.stderr.write(`Search error: ${err.message}\n`);
    }
    setError(errorMessage);
    showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message: errorMessage,
    });
  };

  // Define the search function
  const performSearch = async (query: string) => {
    if (!query) {
      setApps([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Search using iTunes API - no authentication required, rich data immediately
      const itunesResults = await searchITunesApps(query.trim(), 20);

      if (itunesResults.length === 0) {
        setApps([]);
        setTotalResults(0);
        return;
      }

      // Convert iTunes results to AppDetails - already enriched with full metadata
      const mappedApps = itunesResults.map((result) => convertITunesResultToAppDetails(result));

      setApps(mappedApps);
      setTotalResults(mappedApps.length);
    } catch (err) {
      handleSearchError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a debounced version of the search function that doesn't change on re-renders
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, debounceMs),
    [], // Empty dependency array to ensure stability
  );

  // Update search when text changes
  useEffect(() => {
    if (searchText) {
      debouncedSearch(searchText);
    } else {
      setApps([]);
      setError(null);
    }

    // Cleanup function to cancel any pending debounced calls
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchText, debouncedSearch]);

  return {
    apps,
    isLoading,
    error,
    totalResults,
    searchText,
    setSearchText: (text: string) => setSearchText(text),
  };
}
