import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllLists, fetchGetSingleListBookmarks } from "../apis";
import { ApiResponse, List, ListDetails } from "../types";

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
          const details = (await fetchGetSingleListBookmarks(list.id)) as ListDetails;
          return {
            ...list,
            count: details.bookmarks?.length || 0,
          };
        } catch {
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
