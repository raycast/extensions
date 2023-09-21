import { useEffect, useState } from "react";
import { LookupHistoryItem } from "../common/types/lookupHistoryItem";
import { LocalStorage } from "@raycast/api";

/**
 * Hook that returns lookups stored in localStorage.
 * Items are returned in descending order by time of lookup.
 */
export const useLookupHistory = () => {
  const [historyItems, setHistoryItems] = useState<LookupHistoryItem[]>([]);

  useEffect(() => {
    (async () => {
      const storageItems = await LocalStorage.allItems();
      const historyItems: LookupHistoryItem[] = Object.keys(storageItems).map((key) => JSON.parse(storageItems[key]));
      const descByTimestamp = historyItems.sort((a, b) => b.lookupTimestamp - a.lookupTimestamp);
      setHistoryItems(descByTimestamp);
    })();
  }, []);

  return historyItems;
};
