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
      setState((prev) => ({
        ...prev,
        allBookmarks: prev.isInitialLoad
          ? removeDuplicates(data.bookmarks || [])
          : removeDuplicates([...prev.allBookmarks, ...(data.bookmarks || [])]),
        isInitialLoad: false,
      }));
    }
  }, [data, removeDuplicates]);

  const loadNextPage = useCallback(() => {
    if (!data?.nextCursor || isLoading || !data.hasMore) return;
    setState((prev) => ({
      ...prev,
      cursor: data.nextCursor ?? undefined,
    }));
  }, [data, isLoading]);

  const refresh = useCallback(() => {
    setState({
      allBookmarks: [],
      isInitialLoad: true,
      cursor: undefined,
    });
    revalidate();
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
