import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetAllBookmarks } from "../apis";
import { GetBookmarksParams } from "../types";

const log = logger.child("[GetAllBookmarks]");

/**
 * Hook to fetch all bookmarks with native Raycast pagination support.
 * Eliminates manual state management and cursor tracking.
 */
export function useGetAllBookmarks({ favourited, archived, type }: GetBookmarksParams = {}) {
  const abortable = useRef<AbortController | null>(null);

  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (favourited, archived, type) => async (options) => {
      log.log("Fetching bookmarks", { favourited, archived, type, cursor: options.cursor });
      const result = await fetchGetAllBookmarks({
        cursor: options.cursor,
        favourited,
        archived,
        type,
      });
      log.info("Bookmarks fetched", { count: result.bookmarks?.length ?? 0, hasMore: result.nextCursor != null });

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor != null,
        cursor: result.nextCursor ?? undefined,
      };
    },
    [favourited, archived, type],
    {
      initialData: [],
      abortable,
      // Helps smooth UX when args change and ensures the list doesn't flicker.
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (error) {
      log.error("Failed to fetch bookmarks", { favourited, archived, error });
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
