import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { fetchGetSingleTagBookmarks } from "../apis";
import { ApiResponse, Bookmark } from "../types";

interface TagBookmarksState {
  allBookmarks: Bookmark[];
  isInitialLoad: boolean;
  cursor?: string | null;
}

export function useGetTagsBookmarks(tagId: string) {
  const [state, setState] = useState<TagBookmarksState>({
    allBookmarks: [],
    isInitialLoad: true,
    cursor: undefined,
  });

  const removeDuplicates = useCallback(
    (bookmarks: Bookmark[]) => Array.from(new Map(bookmarks.map((b) => [b.id, b])).values()),
    [],
  );

  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (tagId: string, cursor) => {
      const result = (await fetchGetSingleTagBookmarks(tagId, cursor || undefined)) as ApiResponse<Bookmark>;
      return {
        bookmarks: result.bookmarks,
        hasMore: result.nextCursor !== null,
        nextCursor: result.nextCursor,
      };
    },
    [tagId, state.cursor],
    {
      execute: true,
      keepPreviousData: false,
    },
  );

  useEffect(() => {
    setState({
      allBookmarks: [],
      isInitialLoad: true,
      cursor: undefined,
    });
  }, [tagId]);

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
      cursor: data.nextCursor,
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
