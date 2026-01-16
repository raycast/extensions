import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { fetchGetSingleTagBookmarks } from "../apis";
import { ApiResponse, Bookmark } from "../types";

/**
 * Hook to fetch bookmarks for a specific tag with native Raycast pagination support.
 * Eliminates manual state management and cursor tracking.
 */
export function useGetTagsBookmarks(tagId: string) {
  const abortable = useRef<AbortController | null>(null);

  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (tagId) => async (options) => {
      const result = (await fetchGetSingleTagBookmarks(tagId, options.cursor)) as ApiResponse<Bookmark>;

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor !== null,
        cursor: result.nextCursor,
      };
    },
    [tagId],
    {
      initialData: [],
      abortable,
    },
  );

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch tag bookmarks:", error);
    }
  }, [error]);

  return {
    isLoading,
    bookmarks: data || [],
    error,
    revalidate,
    pagination,
  };
}
