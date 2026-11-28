import { Cache, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { MAX_SEARCH_PAGE_SIZE, searchLibrary } from "./api";
import { SaveGrid } from "./components/SaveGrid";
import { showSaveeError } from "./errors";
import { describeSearchesLeft, getRemaining, WEEKLY_SEARCH_POLICY } from "./rate-limit";
import { Save } from "./types";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 600;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Every search counts towards 200 a week, so the first page of each query is kept for an hour
const cache = new Cache({ namespace: "library-search" });

type CachedPage = {
  savedAt: number;
  data: Save[];
  cursor?: string;
  hasMore: boolean;
};

function readCachedPage(query: string): CachedPage | undefined {
  const raw = cache.get(query.toLowerCase());
  if (!raw) return undefined;

  try {
    const page = JSON.parse(raw) as CachedPage;
    return Date.now() - page.savedAt < CACHE_TTL_MS ? page : undefined;
  } catch {
    return undefined;
  }
}

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const query = useDebouncedValue(searchText.trim(), DEBOUNCE_MS);
  const [searchesLeft, setSearchesLeft] = useState<number | undefined>(() => {
    const stored = cache.get("searches-left");
    return stored ? Number(stored) : undefined;
  });
  const canSearch = query.length >= MIN_QUERY_LENGTH;

  const { data, isLoading, pagination } = usePromise(
    (currentQuery: string) => async (options: { cursor?: string }) => {
      if (!options.cursor) {
        const cached = readCachedPage(currentQuery);
        if (cached) {
          return { data: cached.data, hasMore: cached.hasMore, cursor: cached.cursor };
        }
      }

      const { data: page, rateLimits } = await searchLibrary(currentQuery, options.cursor);
      const remaining = getRemaining(rateLimits, WEEKLY_SEARCH_POLICY);
      if (remaining !== undefined) {
        setSearchesLeft(remaining);
        cache.set("searches-left", String(remaining));
      }

      const result = { data: page.data, hasMore: page.has_more, cursor: page.next_cursor ?? undefined };
      if (!options.cursor) {
        cache.set(currentQuery.toLowerCase(), JSON.stringify({ ...result, savedAt: Date.now() }));
      }
      return result;
    },
    [query],
    { execute: canSearch, onError: showSaveeError },
  );

  const isTyping = searchText.trim() !== query;
  const saves = canSearch ? (data ?? []) : [];

  return (
    <SaveGrid
      saves={saves}
      isLoading={(canSearch && isLoading) || (isTyping && searchText.trim().length >= MIN_QUERY_LENGTH)}
      searchBarPlaceholder="Search Savee's library"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      pagination={pagination ? { ...pagination, pageSize: MAX_SEARCH_PAGE_SIZE } : undefined}
      sectionTitle={canSearch ? "Results" : undefined}
      sectionSubtitle={describeSearchesLeft(searchesLeft)}
      emptyView={
        canSearch ? (
          <Grid.EmptyView
            icon={Icon.MagnifyingGlass}
            title={"Nothing for “" + query + "”"}
            description="Try other words"
          />
        ) : (
          <Grid.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Search Savee's library"
            description={
              "References from everyone on Savee. " +
              (describeSearchesLeft(searchesLeft) ?? "You get 200 searches a week") +
              "."
            }
          />
        )
      }
    />
  );
}
