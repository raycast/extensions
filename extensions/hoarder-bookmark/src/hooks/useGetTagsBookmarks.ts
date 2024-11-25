import { useCachedPromise } from "@raycast/utils";
import { fetchGetSingleTagBookmarks } from "../apis";
import { ApiResponse, Bookmark } from "../types";
export function useGetTagsBookmarks(tagId: string) {
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
      const result = (await fetchGetSingleTagBookmarks(tagId)) as ApiResponse<Bookmark>;
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
