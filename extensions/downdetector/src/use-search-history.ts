import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Service } from "./api";

const HISTORY_KEY = "dd-search-history";
const MAX_ITEMS = 10;

export type HistoryItem = Pick<Service, "slug" | "name" | "url" | "status">;

export function useSearchHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load on mount
  useEffect(() => {
    LocalStorage.getItem<string>(HISTORY_KEY).then((raw) => {
      if (!raw) return;
      try {
        setHistory(JSON.parse(raw));
      } catch {
        /* ignore corrupt data */
      }
    });
  }, []);

  const persist = useCallback(async (items: HistoryItem[]) => {
    setHistory(items);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  }, []);

  const addToHistory = useCallback(
    (service: Service) => {
      const item: HistoryItem = {
        slug: service.slug,
        name: service.name,
        url: service.url,
        status: service.status,
      };
      const updated = [
        item,
        ...history.filter((h) => h.slug !== service.slug),
      ].slice(0, MAX_ITEMS);
      persist(updated);
    },
    [history, persist],
  );

  const removeFromHistory = useCallback(
    (slug: string) => persist(history.filter((h) => h.slug !== slug)),
    [history, persist],
  );

  const clearHistory = useCallback(() => persist([]), [persist]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
