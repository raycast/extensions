import type { GoogleBooksResponse, VolumeItem } from "../types/google-books.dt";
import { useCachedState, useFetch } from "@raycast/utils";
import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { useCallback, useRef, useState, useEffect } from "react";

const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_CLOUD_CREDENTIALS_URL = "https://console.cloud.google.com/apis/credentials";
const MAX_RESULTS = 40;
const FIELDS = [
  "items(id,volumeInfo(title,subtitle,authors,description,categories,",
  "imageLinks/thumbnail,publisher,publishedDate,pageCount,",
  "averageRating,ratingsCount,printType,language,maturityRating,",
  "industryIdentifiers(type,identifier),infoLink),",
  "saleInfo(retailPrice(amount,currencyCode),listPrice(amount,currencyCode),isEbook,buyLink))",
].join("");

type UseSearchReturn = { items: VolumeItem[]; loading: boolean; clearCache: () => void };

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}

function buildSearchUrl(query: string): string {
  const { apiKey } = getPreferenceValues<Preferences>();
  const url = new URL(GOOGLE_BOOKS_API_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", MAX_RESULTS.toString());
  url.searchParams.set("fields", FIELDS);
  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }
  return url.toString();
}

function useSearch(query: string | undefined): UseSearchReturn {
  const debouncedQuery = useDebouncedValue(query, 300);
  const [cachedResults, setCachedResults] = useCachedState<VolumeItem[]>("last-results", []);

  const { isLoading, data } = useFetch(buildSearchUrl(debouncedQuery ?? ""), {
    mapResult(result: GoogleBooksResponse) {
      return {
        data: (result.items ?? []).filter((item) => item.volumeInfo?.title),
      };
    },
    initialData: [],
    keepPreviousData: true,
    execute: !!debouncedQuery,
    onData(fetchedItems: VolumeItem[]) {
      setCachedResults(fetchedItems);
    },
    async onError(error: Error) {
      if (error.message.includes("Too Many Requests")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Rate Limited",
          message: "Set a Google Books API key in extension preferences to avoid this.",
          primaryAction: {
            title: "How to Get an API Key",
            onAction: () => open(GOOGLE_CLOUD_CREDENTIALS_URL),
          },
        });
      }
    },
  });

  const clearCache = useCallback(() => setCachedResults([]), [setCachedResults]);
  const items = data.length > 0 ? data : cachedResults;
  return { loading: isLoading, items, clearCache };
}

export { useSearch };
