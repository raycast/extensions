import { useEffect } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getHistoryWithStars } from "../helpers/history";
import { STORAGE_KEYS, subscribeToStorage } from "../helpers/storage";

const EMPTY: Awaited<ReturnType<typeof getHistoryWithStars>> = [];

/**
 * History, most recent first, with starred state. Reloads after any write to History or stars.
 */
export function useHistory() {
  const { data, isLoading, revalidate } = useCachedPromise(getHistoryWithStars, [], { keepPreviousData: true });

  useEffect(
    () => subscribeToStorage([STORAGE_KEYS.USAGE_HISTORY, STORAGE_KEYS.STARRED_HISTORY_ITEMS], revalidate),
    [revalidate],
  );

  return { history: data ?? EMPTY, isLoading };
}
