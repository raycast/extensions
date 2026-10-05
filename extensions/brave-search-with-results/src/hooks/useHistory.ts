import { useLocalStorage } from "@raycast/utils";
import { randomUUID } from "crypto";
import { useCallback } from "react";

export enum Type {
  Web = "web",
  Image = "image",
}

export interface HistoryItem {
  id: string;
  query: string;
  date: number;
}

export default function useHistory(type: Type) {
  const { value, setValue, removeValue, isLoading } = useLocalStorage<HistoryItem[]>(type, []);

  const addHistoryItem = useCallback(
    (query: string) => {
      const newItem = {
        id: randomUUID(),
        query: query.toLocaleLowerCase(),
        date: Date.now(),
      } as HistoryItem;

      // Don't allow modification while the history is still loading
      if (isLoading || value == null) {
        console.warn("history is still loading, cannot add new item");
        return;
      }

      const nextItems = [newItem, ...value.filter((item) => item.query !== newItem.query)];

      return setValue(nextItems);
    },
    [value, setValue, type],
  );

  const removeHistoryItem = useCallback(
    (id: string) => {
      // Don't allow modification while the history is still loading
      if (isLoading || value == null) {
        console.warn("history is still loading, cannot remove item");
        return;
      }

      const nextItems = [...value.filter((item) => item.id !== id)];

      return setValue(nextItems);
    },
    [value, setValue],
  );

  return {
    isLoadingHistory: isLoading,
    historyItems: value ?? [],
    addHistoryItem,
    removeHistoryItem,
    clearHistory: removeValue,
  };
}
