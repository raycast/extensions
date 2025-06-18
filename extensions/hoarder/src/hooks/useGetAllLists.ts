import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllLists, fetchGetSingleListBookmarks } from "../apis";
import { List, Bookmark, ApiResponse } from "../types";

interface ListWithCount extends List {
  count: number;
}

export function useGetAllLists() {
  const { isLoading, data, error, revalidate } = useCachedPromise(async () => {
    const result = (await fetchGetAllLists()) as ApiResponse<List>;
    const lists = result.lists || [];

    const listsWithCount = await Promise.all(
      lists.map(async (list: List) => {
        try {
          // Use fetchGetSingleListBookmarks to get bookmarks for the count
          const bookmarkData = (await fetchGetSingleListBookmarks(list.id)) as ApiResponse<Bookmark>;
          const count = bookmarkData.bookmarks?.length || 0;
          return {
            ...list,
            count: count,
          };
        } catch (e) {
          // It's good practice to still log the error, but not the full objects unless necessary for debugging
          console.error(
            `Error fetching bookmark data for list ${list.id} (${list.name}):`,
            e instanceof Error ? e.message : e,
          );
          return { ...list, count: 0 } as ListWithCount;
        }
      }),
    );

    return listsWithCount;
  });

  return {
    isLoading,
    lists: data || [],
    error,
    revalidate,
  };
}
