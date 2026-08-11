import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetSingleListBookmarks } from "../apis";
import { handleFetchError } from "../utils/fetchError";
import { useLiveData } from "./useLiveData";

const log = logger.child("[ListsBookmarks]");

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
      onError: handleFetchError("bookmarks"),
    },
  );

  useEffect(() => {
    if (error) {
      log.error("Failed to fetch list bookmarks", { listId, error });
    }
  }, [error]);

  const hasLiveData = useLiveData(isLoading, error, listId);

  return {
    isLoading,
    bookmarks: data || [],
    error,
    hasLiveData,
    revalidate,
    pagination,
  };
}
