import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetSingleTagBookmarks } from "../apis";
import { handleFetchError } from "../utils/fetchError";
import { useLiveData } from "./useLiveData";

const log = logger.child("[TagsBookmarks]");

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
      onError: handleFetchError("bookmarks"),
    },
  );

  useEffect(() => {
    if (error) {
      log.error("Failed to fetch tag bookmarks", { tagId, error });
    }
  }, [error]);

  const hasLiveData = useLiveData(isLoading, error, tagId);

  return {
    isLoading,
    bookmarks: data || [],
    error,
    hasLiveData,
    revalidate,
    pagination,
  };
}
