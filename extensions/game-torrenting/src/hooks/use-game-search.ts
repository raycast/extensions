import { useFetch } from "@raycast/utils";
import { type GameItem, parseSearchPage } from "../api";
import { DEFAULT_MIRROR, DEFAULT_HEADERS } from "../constants";
import { useState, useEffect, useRef } from "react";

export const useGameSearch = (queryText?: string) => {
  const [items, setItems] = useState<GameItem[]>([]);
  const loadedCount = useRef(0);

  useEffect(() => {
    setItems([]);
    loadedCount.current = 0;
  }, [queryText]);

  const { isLoading, error, pagination } = useFetch(
    (options) => {
      // Ensure we always return a valid URL string to prevent undici parsing errors,
      // even if we intend to skip execution via the 'execute' flag.
      if (!queryText || queryText.length === 0) {
        return "https://example.com";
      }

      const pageParam = options.page + 1;
      return `${DEFAULT_MIRROR}/search?query=${encodeURIComponent(queryText)}&torrent_type=4&ordering=-uploaded&page=${pageParam}`;
    },
    {
      headers: DEFAULT_HEADERS,
      execute: !!queryText && queryText.length > 0,
      mapResult: (result: GameItem[]) => {
        const isFullPage = result.length === 25;
        const hasEnough = loadedCount.current >= 75;

        return {
          data: result,
          hasMore: isFullPage && !hasEnough,
        };
      },
      onData: (data: GameItem[]) => {
        setItems((previous) => {
          const existingIds = new Set(previous.map((item) => item.id));
          const newItems = data.filter((item) => !existingIds.has(item.id));

          loadedCount.current = previous.length + newItems.length;

          return [...previous, ...newItems];
        });
      },
      parseResponse: async (response) => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const text = await response.text();
        return parseSearchPage(text);
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  return {
    data: items,
    isLoading,
    error,
    pagination,
  };
};
