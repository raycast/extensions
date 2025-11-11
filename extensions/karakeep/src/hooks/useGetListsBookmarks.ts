import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { fetchGetSingleListBookmarks } from "../apis";
import { ApiResponse, Bookmark } from "../types";

/**
 * Hook to fetch bookmarks for a specific list with native Raycast pagination support.
 * Eliminates manual state management and cursor tracking.
 */
export function useGetListsBookmarks(listId: string) {
  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (listId) => async (options) => {
      const result = (await fetchGetSingleListBookmarks(listId, options.cursor)) as ApiResponse<Bookmark>;

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor !== null,
        cursor: result.nextCursor,
      };
    },
    [listId],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch list bookmarks:", error);
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
