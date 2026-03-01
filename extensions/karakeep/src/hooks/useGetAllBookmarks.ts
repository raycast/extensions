import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetAllBookmarks } from "../apis";
import { GetBookmarksParams } from "../types";

/**
 * Hook to fetch all bookmarks with native Raycast pagination support.
 * Eliminates manual state management and cursor tracking.
 */
export function useGetAllBookmarks({ favourited, archived }: GetBookmarksParams = {}) {
  const abortable = useRef<AbortController | null>(null);

  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (favourited, archived) => async (options) => {
      const result = await fetchGetAllBookmarks({
        cursor: options.cursor,
        favourited,
        archived,
      });

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor != null,
        cursor: result.nextCursor ?? undefined,
      };
    },
    [favourited, archived],
    {
      initialData: [],
      abortable,
      // Helps smooth UX when args change and ensures the list doesn't flicker.
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (error) {
      logger.error("Failed to fetch bookmarks", { favourited, archived, error });
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
