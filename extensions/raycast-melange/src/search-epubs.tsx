import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Icon, Image, List, Toast, getPreferenceValues, open, showToast } from "@raycast/api";

import { SearchResult, buildAbsoluteUrl, buildSearchPath, buildSlowDownloadUrl, searchEpubs } from "./annas";
import { buildCleanFileBaseName, downloadEpub, getContainingDirectory } from "./download";
import { RankedSearchResult, rankResultsByFuzzyMatch } from "./fuzzy";

const SEARCH_DEBOUNCE_MS = 200;
const MIN_SEARCH_LENGTH = 2;
const MAX_RESULT_PAGES = 1;
const MAX_RESULTS = 40;
const RAYCAST_PAGE_SIZE = 10;
const MAX_SEARCH_CACHE_ENTRIES = 20;
const searchPageCache = new Map<string, Promise<Awaited<ReturnType<typeof searchEpubs>>>>();

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [lastSearchUrl, setLastSearchUrl] = useState<string>();
  const activeSearchId = useRef(0);
  const activeQuery = useRef("");

  const secretKey = preferences.annaSecretKey?.trim();

  useEffect(() => {
    const query = debouncedSearchText;
    activeQuery.current = query;
    const searchId = activeSearchId.current + 1;
    activeSearchId.current = searchId;

    if (query.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setPage(0);
      setHasMore(false);
      setError(undefined);
      setLastSearchUrl(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(!hasCachedSearchPage(query, 1));
    setError(undefined);

    cachedSearchEpubs(query, 1)
      .then((resultPage) => {
        if (activeSearchId.current !== searchId) {
          return;
        }

        const cappedResults = capResults(resultPage.results);
        setResults(cappedResults);
        setPage(resultPage.page);
        setHasMore(canLoadMore(resultPage.hasMore, resultPage.page, cappedResults.length));
        setLastSearchUrl(resultPage.searchUrl);
      })
      .catch((caughtError) => {
        if (activeSearchId.current !== searchId) {
          return;
        }

        setResults([]);
        setPage(0);
        setHasMore(false);
        setLastSearchUrl(buildAbsoluteUrl(buildSearchPath(query, 1)));
        setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        if (activeSearchId.current === searchId) {
          setIsLoading(false);
        }
      });
  }, [debouncedSearchText]);

  const loadMore = useCallback(async () => {
    const query = activeQuery.current;
    if (!query || !hasMore || isLoading || isLoadingMore || page >= MAX_RESULT_PAGES || results.length >= MAX_RESULTS) {
      return;
    }

    setIsLoadingMore(true);
    setError(undefined);

    try {
      const nextPage = page + 1;
      const resultPage = await cachedSearchEpubs(query, nextPage);

      if (activeQuery.current !== query) {
        return;
      }

      const nextResults = appendUniqueResults(results, resultPage.results);
      setResults(nextResults);
      setPage(resultPage.page);
      setHasMore(canLoadMore(resultPage.hasMore, resultPage.page, nextResults.length));
      setLastSearchUrl(resultPage.searchUrl);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoading, isLoadingMore, page, results]);

  const pagination = useMemo(
    () => ({
      hasMore,
      onLoadMore: loadMore,
      pageSize: RAYCAST_PAGE_SIZE,
    }),
    [hasMore, loadMore],
  );

  const displayResults = useMemo(
    () => rankResultsByFuzzyMatch(results, debouncedSearchText),
    [debouncedSearchText, results],
  );
  const selectedItemId = displayResults[0]?.md5;

  const emptyTitle = !searchText.trim() ? "Search Anna's Archive" : error ? "Search Failed" : "No EPUB Results";

  const emptyDescription = !searchText.trim()
    ? "Type a title, author, ISBN, or keyword."
    : error
      ? error
      : "Try a different search term.";

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      navigationTitle="Search EPUBs"
      onSearchTextChange={setSearchText}
      pagination={debouncedSearchText.length >= MIN_SEARCH_LENGTH && hasMore ? pagination : undefined}
      searchBarPlaceholder="Search EPUBs on Anna's Archive"
      selectedItemId={selectedItemId}
    >
      {displayResults.length === 0 ? (
        <List.EmptyView icon={error ? Icon.Warning : Icon.Book} title={emptyTitle} description={emptyDescription} />
      ) : null}

      {displayResults.map((result, index) => (
        <List.Item
          id={result.md5}
          key={result.md5}
          icon={getResultIcon(result, index === 0)}
          title={result.title}
          subtitle={result.author}
          accessories={buildAccessories(result, index === 0)}
          keywords={[result.author, result.year, result.language, result.md5].filter(Boolean) as string[]}
          actions={
            <ResultActions
              result={result}
              secretKey={secretKey}
              downloadDirectory={preferences.downloadDirectory}
              searchUrl={lastSearchUrl ?? buildAbsoluteUrl(buildSearchPath(searchText.trim(), 1))}
            />
          }
        />
      ))}
    </List>
  );
}

function getResultIcon(result: RankedSearchResult, isBest: boolean): List.Item.Props["icon"] {
  if (isBest && result.coverUrl) {
    return {
      source: result.coverUrl,
      fallback: Icon.Book,
      mask: Image.Mask.RoundedRectangle,
    };
  }

  return Icon.Book;
}

function ResultActions(props: {
  result: SearchResult;
  secretKey?: string;
  downloadDirectory?: string;
  searchUrl: string;
}) {
  const { result, secretKey, downloadDirectory, searchUrl } = props;
  const slowDownloadUrl = buildSlowDownloadUrl(result.md5, result.sourceDomain);
  const cleanFilename = `${buildCleanFileBaseName(result)}.epub`;

  const handleDownload = useCallback(async () => {
    if (!secretKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Secret key missing",
        message: "Add annaSecretKey in Raycast extension preferences.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading EPUB",
      message: result.title,
    });

    try {
      const filePath = await downloadEpub(result, {
        secretKey,
        downloadDirectory,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Downloaded EPUB";
      toast.message = filePath;
      await open(getContainingDirectory(filePath));
    } catch (caughtError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download failed";
      toast.message = getErrorMessage(caughtError);
    }
  }, [downloadDirectory, result, secretKey]);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Slow Download Page" url={slowDownloadUrl} />
        <Action.OpenInBrowser title="Open Result Page" url={result.url} />
        {secretKey ? (
          <Action
            icon={Icon.Download}
            title="Download EPUB"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={handleDownload}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy MD5"
          content={result.md5}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard title="Copy Result URL" content={result.url} />
        <Action.CopyToClipboard title="Copy Slow Download URL" content={slowDownloadUrl} />
        <Action.CopyToClipboard title="Copy Search URL" content={searchUrl} />
        <Action.CopyToClipboard title="Copy Clean Filename" content={cleanFilename} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function buildAccessories(result: RankedSearchResult, isBest: boolean): List.Item.Accessory[] {
  return [
    isBest ? { text: "Best" } : undefined,
    result.format ? { text: result.format } : undefined,
    result.size ? { text: result.size } : undefined,
    result.year ? { text: result.year } : undefined,
    result.language ? { text: result.language } : undefined,
  ].filter(Boolean) as List.Item.Accessory[];
}

function appendUniqueResults(currentResults: SearchResult[], nextResults: SearchResult[]): SearchResult[] {
  const resultsByMd5 = new Map(currentResults.map((result) => [result.md5, result]));

  for (const result of nextResults) {
    resultsByMd5.set(result.md5, result);
  }

  return capResults([...resultsByMd5.values()]);
}

function capResults(results: SearchResult[]): SearchResult[] {
  return results.slice(0, MAX_RESULTS);
}

function canLoadMore(sourceHasMore: boolean, currentPage: number, resultCount: number): boolean {
  return sourceHasMore && currentPage < MAX_RESULT_PAGES && resultCount < MAX_RESULTS;
}

function hasCachedSearchPage(query: string, page: number): boolean {
  return searchPageCache.has(buildSearchPageCacheKey(query, page));
}

async function cachedSearchEpubs(query: string, page: number): Promise<Awaited<ReturnType<typeof searchEpubs>>> {
  const cacheKey = buildSearchPageCacheKey(query, page);
  const cachedPage = searchPageCache.get(cacheKey);
  if (cachedPage) {
    return cachedPage;
  }

  const searchPage = searchEpubs(query, page).catch((error) => {
    searchPageCache.delete(cacheKey);
    throw error;
  });

  searchPageCache.set(cacheKey, searchPage);
  pruneSearchPageCache();
  return searchPage;
}

function buildSearchPageCacheKey(query: string, page: number): string {
  return `${query.trim().toLowerCase()}::${page}`;
}

function pruneSearchPageCache() {
  while (searchPageCache.size > MAX_SEARCH_CACHE_ENTRIES) {
    const oldestKey = searchPageCache.keys().next().value;
    if (!oldestKey) {
      return;
    }

    searchPageCache.delete(oldestKey);
  }
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
