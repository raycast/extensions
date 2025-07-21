import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "history";

export enum Type {
  Web,
  Image,
}

export interface HistoryItem {
  id: string;
  query: string;
  type: Type;
  date: number;
}

const get = async () => JSON.parse((await LocalStorage.getItem(STORAGE_KEY)) ?? JSON.stringify([])) as HistoryItem[];
const set = (history: HistoryItem[]) => LocalStorage.setItem(STORAGE_KEY, JSON.stringify(history));

export default function useHistory(type: Type) {
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState([] as HistoryItem[]);

  const addToHistory = useCallback(
    (query: string) => {
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
    [items, setItems, type],
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

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.type === type);
  }, [items, type]);

  return { isLoading, items: filteredItems, addToHistory, removeFromHistory, clearHistory };
}
