import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Service } from "./api";

const HISTORY_KEY = "dd-search-history";
const MAX_ITEMS = 10;

// URL is intentionally NOT stored: it is Region-specific and would go stale
// when the Region preference changes. Recompute it from `slug` at use-time
// via getStatusUrl() instead.
export type HistoryItem = Pick<Service, "slug" | "name" | "status">;

export function useSearchHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Track destructive edits made before the initial storage read resolves so a
  // stale snapshot cannot resurrect removed or cleared entries.
  const suppressedSlugsRef = useRef(new Set<string>());
  const wasClearedRef = useRef(false);

  // Load on mount
  useEffect(() => {
    LocalStorage.getItem<string>(HISTORY_KEY).then((raw) => {
      if (!raw) return;
      try {
        const loaded = JSON.parse(raw) as HistoryItem[];
        setHistory((current) =>
          [
            ...current,
            ...loaded.filter(
              (item) =>
                !wasClearedRef.current &&
                !suppressedSlugsRef.current.has(item.slug) &&
                !current.some((h) => h.slug === item.slug),
            ),
          ].slice(0, MAX_ITEMS),
        );
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
      suppressedSlugsRef.current.delete(service.slug);
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
    (slug: string) => {
      suppressedSlugsRef.current.add(slug);
      persist((prev) => prev.filter((h) => h.slug !== slug));
    },
    [persist],
  );

  const clearHistory = useCallback(() => {
    wasClearedRef.current = true;
    suppressedSlugsRef.current.clear();
    persist(() => []);
  }, [persist]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
