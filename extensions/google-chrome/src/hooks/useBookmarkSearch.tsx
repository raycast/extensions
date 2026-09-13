import { HistoryEntry, SearchResult } from "../interfaces";
import { ReactNode, useMemo, useState } from "react";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { NotInstalledError, UnknownError } from "../components";
import { getBookmarks } from "../util";
import { useFrecencySorting, usePromise } from "@raycast/utils";
import { parseSearchQuery, matchesQuery } from "../util/search-parser";

type BookmarkSearchResult = Required<SearchResult<HistoryEntry> & { readonly errorView: ReactNode }> & {
  readonly visitItem: (bookmark: HistoryEntry) => Promise<void>;
  readonly resetRanking: (bookmark: HistoryEntry) => Promise<void>;
};

export function useBookmarkSearch(profile: string, query?: string): BookmarkSearchResult {
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [errorView, setErrorView] = useState<ReactNode>();

  const {
    isLoading,
    data: bookmarkData,
    revalidate,
  } = usePromise(
    async (profile: string, query?: string) => {
      const bookmarks = await getBookmarks(profile);
      setErrorView(undefined);
      setIsEmpty(bookmarks.length === 0);

      const parsedQuery = parseSearchQuery(query || "");

      // Early return if no search query
      if (parsedQuery.includeTerms.length === 0 && parsedQuery.excludeTerms.length === 0) {
        return bookmarks;
      }

      return bookmarks.filter((bookmark) => {
        const searchableText = `${bookmark.title.toLowerCase()} ${bookmark.url.toLowerCase()}`;
        return matchesQuery(searchableText, parsedQuery);
      });
    },
    [profile, query],
    {
      onError(error) {
        if (error.message === NOT_INSTALLED_MESSAGE) {
          setErrorView(<NotInstalledError />);
        } else if (error.message === NO_BOOKMARKS_MESSAGE) {
          setIsEmpty(true);
        } else {
          setErrorView(<UnknownError />);
        }
      },
    },
  );

  const data = isEmpty ? [] : bookmarkData || [];
  // useFrecencySorting sorts its input in place, so it gets a copy: `data` keeps the pristine
  // bookmark folder order that `baseOrder` records and that never-visited bookmarks keep.
  // Keying by id holds only while getBookmarks returns a single bookmarks file, never a merge of both.
  const baseOrder = useMemo(() => new Map<string, number>(data.map((bookmark, i) => [bookmark.id, i])), [data]);
  const sortableBookmarks = useMemo(() => [...data], [data]);
  const {
    data: sortedData,
    visitItem,
    resetRanking,
  } = useFrecencySorting(sortableBookmarks, {
    namespace: "bookmarks",
    key: (bookmark) => bookmark.url,
    sortUnvisited: (a, b) => (baseOrder.get(a.id) ?? 0) - (baseOrder.get(b.id) ?? 0),
  });

  return { errorView, isLoading, data: sortedData, revalidate, visitItem, resetRanking };
}
