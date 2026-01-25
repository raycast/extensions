import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { fetchGetAllBookmarks } from "../apis";
import { ApiResponse, Bookmark, GetBookmarksParams } from "../types";

/**
 * Hook to fetch all bookmarks with native Raycast pagination support.
 * Eliminates manual state management and cursor tracking.
 */
export function useGetAllBookmarks({ favourited, archived }: GetBookmarksParams = {}) {
  const abortable = useRef<AbortController | null>(null);

  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (favourited, archived) => async (options) => {
      const result = (await fetchGetAllBookmarks({
        cursor: options.cursor,
        favourited,
        archived,
      })) as ApiResponse<Bookmark>;

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor !== null,
        cursor: result.nextCursor,
      };
    },
    [favourited, archived],
    {
      initialData: [],
      abortable,
    },
  );

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch bookmarks:", error);
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
