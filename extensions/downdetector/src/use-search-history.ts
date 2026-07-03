import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Service } from "./api";

const HISTORY_KEY = "dd-search-history";
const MAX_ITEMS = 10;

// URL is intentionally NOT stored: it is Region-specific and would go stale
// when the Region preference changes. Recompute it from `slug` at use-time
// via getStatusUrl() instead.
export type HistoryItem = Pick<Service, "slug" | "name" | "status">;

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

  const persist = useCallback(
    (updater: (prev: HistoryItem[]) => HistoryItem[]) => {
      setHistory((prev) => {
        const updated = updater(prev);
        LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [],
  );

  const addToHistory = useCallback(
    (service: Service) => {
      const item: HistoryItem = {
        slug: service.slug,
        name: service.name,
        status: service.status,
      };
      persist((prev) =>
        [item, ...prev.filter((h) => h.slug !== service.slug)].slice(
          0,
          MAX_ITEMS,
        ),
      );
    },
    [persist],
  );

  const removeFromHistory = useCallback(
    (slug: string) => persist((prev) => prev.filter((h) => h.slug !== slug)),
    [persist],
  );

  const clearHistory = useCallback(() => persist(() => []), [persist]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
