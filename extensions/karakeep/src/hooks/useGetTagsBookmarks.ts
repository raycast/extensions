import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetSingleTagBookmarks } from "../apis";

/**
 * Hook to fetch bookmarks for a specific tag with native Raycast pagination support.
 * Eliminates manual state management and cursor tracking.
 */
export function useGetTagsBookmarks(tagId: string) {
  const abortable = useRef<AbortController | null>(null);

  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (tagId) => async (options) => {
      const result = await fetchGetSingleTagBookmarks(tagId, options.cursor);

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor != null,
        cursor: result.nextCursor ?? undefined,
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
      logger.error("Failed to fetch tag bookmarks", { tagId, error });
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
