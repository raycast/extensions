import { useCachedPromise } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetAllLists, fetchGetSingleListBookmarks } from "../apis";
import { List } from "../types";

interface ListWithCount extends List {
  count: number;
}

export function useGetAllLists() {
  const { isLoading, data, error, revalidate } = useCachedPromise(async () => {
    const result = await fetchGetAllLists();
    const lists = result.lists || [];

    const listsWithCount = await Promise.all(
      lists.map(async (list: List) => {
        try {
          const details = await fetchGetSingleListBookmarks(list.id);
          return {
            ...list,
            count: details.bookmarks?.length || 0,
          };
        } catch (error) {
          logger.log("Failed to fetch list bookmark count", { listId: list.id, listName: list.name, error });
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
