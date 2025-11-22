import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { HistoryEntry, SearchResult } from "../interfaces";
import { getBookmarks } from "../util";
import { NO_BOOKMARKS_MESSAGE, NOT_INSTALLED_MESSAGE } from "../constants";
import { matchesQuery, parseSearchQuery } from "../util/search-parser";

export function useBookmarkSearch(profile: string, query?: string): SearchResult<HistoryEntry> {
  const [error, setError] = useState<string>();
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  const {
    isLoading,
    data: bookmarkData,
    revalidate,
  } = usePromise(
    async (profile: string, query?: string) => {
      const bookmarks = await getBookmarks(profile);
      setError(undefined);
      setIsEmpty(bookmarks.length === 0);

      const parsedQuery = parseSearchQuery(query || "");
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
      onError(err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
        if ((err as Error).message === NO_BOOKMARKS_MESSAGE) {
          setIsEmpty(true);
        }
        if ((err as Error).message === NOT_INSTALLED_MESSAGE) {
          setIsEmpty(true);
        }
      },
    },
  );

  const data = isEmpty ? [] : bookmarkData || [];

  return { isLoading, data, error, revalidate };
}
