import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { fetchGetSingleListBookmarks } from "../apis";
import { ApiResponse, Bookmark } from "../types";

interface ListBookmarksState {
  allBookmarks: Bookmark[];
  isInitialLoad: boolean;
  cursor?: string | null;
}

export function useGetListsBookmarks(listId: string) {
  const [state, setState] = useState<ListBookmarksState>({
    allBookmarks: [],
    isInitialLoad: true,
    cursor: undefined,
  });

  const removeDuplicates = useCallback(
    (bookmarks: Bookmark[]) => Array.from(new Map(bookmarks.map((b) => [b.id, b])).values()),
    [],
  );

  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (listId, cursor) => {
      const result = (await fetchGetSingleListBookmarks(
        listId,
        cursor === "initial" ? undefined : cursor,
      )) as ApiResponse<Bookmark>;
      return {
        bookmarks: result.bookmarks,
        hasMore: result.nextCursor !== null,
        nextCursor: result.nextCursor,
      };
    },
    [listId, state.cursor],
    {
      execute: true,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    setState({
      allBookmarks: [],
      isInitialLoad: true,
      cursor: undefined,
    });
  }, [listId]);

  useEffect(() => {
    if (data?.bookmarks) {
      setState((prev) => {
        if (prev.isInitialLoad) {
          return {
            allBookmarks: removeDuplicates(data.bookmarks || []),
            isInitialLoad: false,
            cursor: data.nextCursor || null,
          };
        }

        const needsReset = shouldResetCache(data.bookmarks || [], prev.allBookmarks);
        if (needsReset) {
          return {
            allBookmarks: removeDuplicates(data.bookmarks || []),
            isInitialLoad: false,
            cursor: data.nextCursor || null,
          };
        }

        return {
          allBookmarks: removeDuplicates([...prev.allBookmarks, ...(data.bookmarks || [])]),
          isInitialLoad: false,
          cursor: data.nextCursor || null,
        };
      });
    }
  }, [data, removeDuplicates]);

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
