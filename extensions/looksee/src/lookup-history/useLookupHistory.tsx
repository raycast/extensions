import { LookupHistoryItem } from "../common/types/lookupHistoryItem";
import { LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";

/**
 * Hook that returns lookups stored in localStorage.
 * Items are returned in descending order by time of lookup.
 */
export const useLookupHistory = () => {
  const { isLoading, data } = usePromise(async () => {
    const storageItems = await LocalStorage.allItems();
    const historyItems: LookupHistoryItem[] = Object.keys(storageItems).map((key) => JSON.parse(storageItems[key]));
    const descByTimestamp = historyItems.sort((a, b) => b.lookupTimestamp - a.lookupTimestamp);
    return descByTimestamp;
  });

  return { isLoading, data };
};
