import { useCachedPromise } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchGetAllLists, fetchGetSingleListBookmarks } from "../apis";
import { handleFetchError } from "../utils/fetchError";
import { useLiveData } from "./useLiveData";
import { List } from "../types";

const log = logger.child("[GetAllLists]");

interface ListWithCount extends List {
  count: number;
}

/**
 * @param execute set false to hold the fetch until the API is known to be
 * reachable — used by the create forms, which shouldn't fire doomed requests
 * while showing their own offline notice.
 */
export function useGetAllLists(execute = true) {
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
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
            log.log("Failed to fetch list bookmark count", { listId: list.id, listName: list.name, error });
            return { ...list, count: 0 } as ListWithCount;
          }
        }),
      );

      return listsWithCount;
    },
    [],
    { execute, onError: handleFetchError("lists") },
  );

  const hasLiveData = useLiveData(isLoading, error);

  return {
    isLoading,
    lists: data || [],
    error,
    hasLiveData,
    revalidate,
  };
}
