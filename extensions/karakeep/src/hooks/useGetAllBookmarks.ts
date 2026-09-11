import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetAllBookmarks } from "../apis";
import { GetBookmarksParams } from "../types";
import { handleFetchError } from "../utils/fetchError";
import { useLiveData } from "./useLiveData";

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
      // Suppresses Raycast's built-in "Failed to fetch latest data" toast, which
      // names a symptom and races the recovery screen. See handleFetchError.
      onError: handleFetchError("bookmarks"),
    },
  );

  useEffect(() => {
    if (error) {
      log.error("Failed to fetch bookmarks", { favourited, archived, error });
    }
  }, [error]);

  // NOT `data.length > 0`: useCachedPromise restores the previous run's rows
  // from disk, so a populated list says nothing about the server being up.
  const hasLiveData = useLiveData(isLoading, error, `${favourited ?? ""}|${archived ?? ""}|${type ?? ""}`);

  return {
    isLoading,
    bookmarks: data || [],
    error,
    hasLiveData,
    revalidate,
    pagination,
  };
}
