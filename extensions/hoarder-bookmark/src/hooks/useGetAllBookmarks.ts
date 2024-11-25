import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllBookmarks } from "../apis";
import { Bookmark } from "../types";

interface FetchResponse {
  bookmarks: Bookmark[];
}

export function useGetAllBookmarks() {
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
      const result = (await fetchGetAllBookmarks()) as FetchResponse;
      return result.bookmarks || [];
    },
    [],
    {
      execute: true,
    },
  );

  return {
    isLoading,
    bookmarks: data || [],
    error,
    revalidate,
  };
}
