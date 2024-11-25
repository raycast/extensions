import { useCachedPromise } from "@raycast/utils";
import { fetchGetSingleListBookmarks } from "../apis";
import { ApiResponse, Bookmark } from "../types";
export function useGetListsBookmarks(listId: string) {
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
      const result = (await fetchGetSingleListBookmarks(listId)) as ApiResponse<Bookmark>;
      return result?.bookmarks || [];
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
