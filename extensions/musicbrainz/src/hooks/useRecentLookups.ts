import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { EntityType } from "../types";

export interface RecentLookup {
  entityType: EntityType;
  mbid: string;
  name: string;
  subtitle: string;
  timestamp: number;
}

const MAX_RECENT = 25;
const STORAGE_KEY = "recent-lookups";

async function loadFromStorage(): Promise<RecentLookup[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);

  return raw ? JSON.parse(raw) : [];
}

export function useRecentLookups() {
  const [recents, setRecents] = useState<RecentLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const revalidate = useCallback(async () => {
    const data = await loadFromStorage();
    setRecents(data);
  }, []);

  useEffect(() => {
    loadFromStorage().then((data) => {
      setRecents(data);
      setIsLoading(false);
    });
  }, []);

  async function clearRecents() {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify([]));

    setRecents([]);
  }

  return { recents, clearRecents, revalidate, isLoading };
}

export async function addRecentLookup(entry: Omit<RecentLookup, "timestamp">) {
  const existing = await loadFromStorage();
  const filtered = existing.filter((r) => r.mbid !== entry.mbid);
  const updated = [{ ...entry, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
