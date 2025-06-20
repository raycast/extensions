import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { GoogleImageResult, SearchOptions, SearchResponse, SearchResult, PaginationInfo } from "../types";
import { getImageType } from "../utils/imageUtils";
import axios from "axios";
import { showFailureToast } from "@raycast/utils";

// Maximum page size for Google API
const PAGE_SIZE = 8;

// Custom hook for Google Image Search API
export function useGoogleImageSearch({ term, limit = 8, viewType = "all" }: SearchOptions): SearchResult {
  const [data, setData] = useState<GoogleImageResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [nextStartIndex, setNextStartIndex] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Get API key and Search Engine ID from Raycast preferences
  const { apiKey, searchEngineId, siteSearch, safeSearch } = getPreferenceValues<Preferences>();

  // Function to fetch images
  async function fetchImages(searchTerm: string, startIndex: number) {
    if (!searchTerm.trim()) {
      setData([]);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    setIsLoading(true);

    try {
      const { fileType, colorType } = getImageType(viewType);

      // Helper to fetch a single page using axios
      async function fetchPage(start: number, num: number) {
        const url = "https://www.googleapis.com/customsearch/v1";

        try {
          const response = await axios.get(url, {
            params: {
              key: apiKey,
              cx: searchEngineId,
              q: searchTerm,
              searchType: "image",
              start: start,
              num: num,
              ...(siteSearch && { siteSearchFilter: "i", siteSearch: siteSearch }),
              safe: safeSearch ? "active" : "off",
              ...(colorType && { imgColorType: colorType }),
              ...(fileType && { fileType: fileType }),
            },
          });

          return response.data as SearchResponse;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            showFailureToast(error, { title: "Failed to fetch images" });
            return { items: [] } as SearchResponse;
          }
          showFailureToast(error, { title: "Unknown error occurred" });
          return { items: [] } as SearchResponse;
        }
      }

      const responseData = await fetchPage(startIndex, limit);
      if (responseData.items && responseData.items.length > 0) {
        // Calculate next start index for pagination
        const newStartIndex = startIndex + responseData.items.length;

        // Update data
        setData((prev) => (startIndex === 1 ? responseData.items || [] : [...prev, ...(responseData.items || [])]));

        // Check if there are more results
        const totalResults = responseData.searchInformation?.totalResults
          ? parseInt(responseData.searchInformation.totalResults, 10)
          : 0;

        const moreAvailable =
          newStartIndex <= 100 && responseData.items.length === limit && newStartIndex < totalResults;

        setHasMore(moreAvailable);
        setNextStartIndex(newStartIndex);
        setError(undefined);
      } else {
        if (startIndex === 1) {
          setData([]);
        }
        setHasMore(false);
        setError(responseData.error?.message || "No results found");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // Load more function for pagination
  function loadMore() {
    if (hasMore && !isLoading) {
      fetchImages(term, nextStartIndex);
    }
  }

  // Initial search effect - refetch when term or viewType changes
  useEffect(() => {
    setNextStartIndex(1);
    fetchImages(term, 1);
  }, [term, viewType]);

  // Create pagination info
  const pagination: PaginationInfo = {
    pageSize: PAGE_SIZE,
    hasMore,
    onLoadMore: loadMore,
    startIndex: nextStartIndex,
    totalResults: 0,
    isLoadingMore: isLoading && data.length > 0,
  };

  return {
    data,
    isLoading,
    error,
    pagination,
  };
}
