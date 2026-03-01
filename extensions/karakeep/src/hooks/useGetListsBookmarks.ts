import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetSingleListBookmarks } from "../apis";

/**
 * Hook to fetch bookmarks for a specific list with native Raycast pagination support.
 * Eliminates manual state management and cursor tracking.
 */
export function useGetListsBookmarks(listId: string) {
  const abortable = useRef<AbortController | null>(null);

  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (listId) => async (options) => {
      const result = await fetchGetSingleListBookmarks(listId, options.cursor);

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor != null,
        cursor: result.nextCursor ?? undefined,
      };
    },
    [listId],
    {
      initialData: [],
      abortable,
    },
  );

  useEffect(() => {
    if (error) {
      logger.error("Failed to fetch list bookmarks", { listId, error });
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
