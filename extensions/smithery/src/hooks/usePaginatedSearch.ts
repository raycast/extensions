import { useCallback, useEffect, useMemo, useState } from "react";
import { PaginatedResponse } from "../api/types";
import { PAGE_SIZE } from "../constants/config";

type FetchFn<T> = (params: {
  q: string;
  page: number;
  pageSize: number;
  signal: AbortSignal;
}) => Promise<PaginatedResponse<T>>;

type UsePaginatedSearchOptions<T> = {
  fetchFn: FetchFn<T>;
  rankComparator: (left: T, right: T) => number;
  dedupKey: (item: T) => string;
  errorLabel: string;
};

type UsePaginatedSearchResult<T> = {
  items: T[];
  isFetching: boolean;
  loadError: Error | undefined;
  searchText: string;
  setSearchText: (text: string) => void;
  isPopularMode: boolean;
  query: string;
  pagination:
    | { pageSize: number; hasMore: boolean; onLoadMore: () => void }
    | undefined;
  refresh: () => void;
};

export function usePaginatedSearch<T>(
  options: UsePaginatedSearchOptions<T>,
): UsePaginatedSearchResult<T> {
  const { fetchFn, rankComparator, dedupKey, errorLabel } = options;

  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState<Error | undefined>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const query = searchText.trim();
  const isPopularMode = query.length === 0;

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    setPage(1);
    setItems([]);
    setHasMore(false);
    setLoadError(undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsFetching(true);
      try {
        const result = await fetchFn({
          q: query,
          page,
          pageSize: PAGE_SIZE,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        const rankedData = isPopularMode
          ? [...result.data].sort(rankComparator)
          : result.data;

        setLoadError(undefined);
        setHasMore(result.hasMore);
        setItems((previous) =>
          page === 1
            ? rankedData
            : (() => {
                const merged = [
                  ...previous,
                  ...rankedData.filter(
                    (next) =>
                      !previous.some(
                        (item) => dedupKey(item) === dedupKey(next),
                      ),
                  ),
                ];

                if (!isPopularMode) {
                  return merged;
                }

                return merged.sort(rankComparator);
              })(),
        );
      } catch (searchError) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadError(
          searchError instanceof Error ? searchError : new Error(errorLabel),
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [
    isPopularMode,
    page,
    query,
    refreshKey,
    fetchFn,
    rankComparator,
    dedupKey,
    errorLabel,
  ]);

  const pagination = useMemo(
    () =>
      items.length > 0
        ? {
            pageSize: PAGE_SIZE,
            hasMore,
            onLoadMore: () => {
              if (!isFetching && hasMore) {
                setPage((previous) => previous + 1);
              }
            },
          }
        : undefined,
    [hasMore, isFetching, items.length],
  );

  const refresh = useCallback(() => {
    setPage(1);
    setRefreshKey((previous) => previous + 1);
  }, []);

  return {
    items,
    isFetching,
    loadError,
    searchText,
    setSearchText: handleSearchTextChange,
    isPopularMode,
    query,
    pagination,
    refresh,
  };
}
