import { useState, useEffect, useCallback } from "react";
import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS, MAX_RECENTLY_KILLED } from "../constants";
import type { KilledEntry } from "../types";

export function useRecentlyKilled() {
  const [entries, setEntries] = useState<KilledEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LocalStorage.getItem<string>(STORAGE_KEYS.RECENTLY_KILLED).then((raw) => {
      if (raw) {
        try {
          setEntries(JSON.parse(raw));
        } catch {
          setEntries([]);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback((updated: KilledEntry[]) => {
    setEntries(updated);
    LocalStorage.setItem(STORAGE_KEYS.RECENTLY_KILLED, JSON.stringify(updated));
  }, []);

  const addEntry = useCallback(
    (entry: KilledEntry) => {
      const updated = [entry, ...entries].slice(0, MAX_RECENTLY_KILLED);
      persist(updated);
    },
    [entries, persist],
  );

  const removeEntry = useCallback(
    (index: number) => {
      const updated = entries.filter((_, i) => i !== index);
      persist(updated);
    },
    [entries, persist],
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return { entries, isLoading, addEntry, removeEntry, clear };
}
