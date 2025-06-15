import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "history";

export enum Type {
  Web,
}

export interface HistoryItem {
  id: string;
  query: string;
  type: Type;
  date: number;
}

const get = async () => JSON.parse((await LocalStorage.getItem(STORAGE_KEY)) ?? JSON.stringify([])) as HistoryItem[];
const set = (history: HistoryItem[]) => LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history));

export default function useHistory() {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([] as HistoryItem[]);

  const addToHistory = useCallback(
    (query: string, type: Type) => {
      const newItem = {
        id: randomUUID(),
        query: query.toLocaleLowerCase(),
        type,
        date: Date.now(),
      } as HistoryItem;

      const nextItems = [
        newItem,
        ...items.filter((item) => (item.query === newItem.query && item.type === newItem.type) === false),
      ];

      setItems(nextItems);
      return set(nextItems);
    },
    [items, setItems],
  );

  const removeFromHistory = useCallback(
    (id: string) => {
      const nextItems = [...items.filter((item) => item.id !== id)];

      setItems(nextItems);
      return set(nextItems);
    },
    [items, setItems],
  );

  const clearHistory = useCallback(() => {
    const nextItems = [] as HistoryItem[];

    setItems(nextItems);
    return set(nextItems);
  }, [setItems]);

  useEffect(() => {
    const initialize = async () => {
      const items = await get();
      setItems(items);
      setIsLoading(false);
    };

    initialize();
  }, []);

  return { isLoading, items, addToHistory, removeFromHistory, clearHistory };
}
