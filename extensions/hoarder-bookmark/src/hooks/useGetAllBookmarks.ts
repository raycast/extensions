import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { fetchGetAllBookmarks } from "../apis";
import { ApiResponse, Bookmark, GetBookmarksParams } from "../types";

interface BookmarksState {
  allBookmarks: Bookmark[];
  isInitialLoad: boolean;
  cursor?: string;
}

export function useGetAllBookmarks({ favourited, archived }: GetBookmarksParams = {}) {
  const [state, setState] = useState<BookmarksState>({
    allBookmarks: [],
    isInitialLoad: true,
    cursor: undefined,
  });

  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (cursor: string | undefined, favourited, archived) => {
      const result = (await fetchGetAllBookmarks({
        cursor,
        favourited,
        archived,
      })) as ApiResponse<Bookmark>;

      const { bookmarks = [], nextCursor } = result;
      return {
        bookmarks,
        hasMore: nextCursor !== null,
        nextCursor,
      };
    },
    [state.cursor, favourited, archived],
    {
      execute: true,
      keepPreviousData: true,
    },
  );

  const removeDuplicates = useCallback(
    (bookmarks: Bookmark[]) => Array.from(new Map(bookmarks.map((b) => [b.id, b])).values()),
    [],
  );

  const shouldResetCache = useCallback((newBookmarks: Bookmark[], cachedBookmarks: Bookmark[]) => {
    if (cachedBookmarks.length === 0) return false;

    const newIds = new Set(newBookmarks.map((b) => b.id));
    const cachedIds = new Set(cachedBookmarks.slice(0, newBookmarks.length).map((b) => b.id));

    if (newIds.size !== cachedIds.size) return true;

    for (const id of newIds) {
      if (!cachedIds.has(id)) return true;
    }
    for (const id of cachedIds) {
      if (!newIds.has(id)) return true;
    }

    const cachedFirstPage = cachedBookmarks.slice(0, newBookmarks.length);
    return !newBookmarks.every((bookmark, index) => bookmark.id === cachedFirstPage[index]?.id);
  }, []);

  useEffect(() => {
    if (!data?.bookmarks) return;

    setState((prev) => {
      if (prev.isInitialLoad) {
        return {
          allBookmarks: data.bookmarks,
          isInitialLoad: false,
          cursor: undefined,
        };
      }

      if (!state.cursor) {
        const needsReset = shouldResetCache(data.bookmarks, prev.allBookmarks);
        if (needsReset) {
          return {
            allBookmarks: data.bookmarks,
            isInitialLoad: false,
            cursor: undefined,
          };
        }
      }

      if (state.cursor) {
        return {
          allBookmarks: removeDuplicates([...prev.allBookmarks, ...data.bookmarks]),
          isInitialLoad: false,
          cursor: state.cursor,
        };
      }

      return prev;
    });
  }, [data, removeDuplicates, shouldResetCache]);

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch bookmarks:", error);
    }
  }, [error]);

  const loadNextPage = useCallback(() => {
    if (!data?.nextCursor || isLoading || !data.hasMore) return;

    setState((prev) => ({
      ...prev,
      cursor: data.nextCursor ?? undefined,
    }));
  }, [data, isLoading]);

  const refresh = useCallback(async () => {
    setState({
      allBookmarks: [],
      isInitialLoad: true,
      cursor: undefined,
    });
    await revalidate();
  }, [revalidate]);

  return {
    isLoading,
    bookmarks: state.allBookmarks,
    hasMore: data?.hasMore ?? false,
    error,
    revalidate: refresh,
    loadNextPage,
  };
}
