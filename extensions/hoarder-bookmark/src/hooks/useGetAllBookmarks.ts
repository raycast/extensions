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

  useEffect(() => {
    if (data?.bookmarks) {
      setState((prev) => ({
        ...prev,
        allBookmarks: prev.isInitialLoad
          ? removeDuplicates(data.bookmarks)
          : removeDuplicates([...prev.allBookmarks, ...data.bookmarks]),
        isInitialLoad: false,
      }));
    }
  }, [data, removeDuplicates]);

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
