import { getPreferenceValues, Cache, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CollectionItem, CollectionResponse } from "./types";

const cache = new Cache();
const CACHE_KEY = "discogs-collection";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

interface CacheEntry {
  items: CollectionItem[];
  fetchedAt: number;
}

function getCached(): CollectionItem[] | null {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return null;
  try {
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.items;
  } catch {
    return null;
  }
}

function setCached(items: CollectionItem[]) {
  const entry: CacheEntry = { items, fetchedAt: Date.now() };
  cache.set(CACHE_KEY, JSON.stringify(entry));
}

async function fetchAllPages(username: string, token: string): Promise<CollectionItem[]> {
  const headers = {
    Authorization: `Discogs token=${token}`,
    "User-Agent": "RaycastDiscogsExtension/1.0",
  };

  const firstRes = await fetch(
    `https://api.discogs.com/users/${username}/collection/folders/0/releases?per_page=100&page=1`,
    { headers }
  );

  if (!firstRes.ok) {
    if (firstRes.status === 401) throw new Error("Invalid token — check your preferences.");
    if (firstRes.status === 404) throw new Error(`User "${username}" not found on Discogs.`);
    throw new Error(`Discogs API error: ${firstRes.status}`);
  }

  const first: CollectionResponse = await firstRes.json();
  const allItems: CollectionItem[] = [...first.releases];
  const totalPages = first.pagination.pages;

  if (totalPages > 1) {
    const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (const page of pageNumbers) {
      const res = await fetch(
        `https://api.discogs.com/users/${username}/collection/folders/0/releases?per_page=100&page=${page}`,
        { headers }
      );
      if (!res.ok) break;
      const data: CollectionResponse = await res.json();
      allItems.push(...data.releases);
    }
  }

  return allItems;
}

export function useCollection() {
  const { username, token } = getPreferenceValues<Preferences.SearchCollection>();
  const [items, setItems] = useState<CollectionItem[]>(() => getCached() ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = getCached();
      if (cached) {
        setItems(cached);
        setIsLoading(false);
        // Revalidate in background
        try {
          const fresh = await fetchAllPages(username, token);
          if (!cancelled) {
            setItems(fresh);
            setCached(fresh);
          }
        } catch {
          // Silently ignore background revalidation errors when we have cache
        }
        return;
      }

      try {
        const fresh = await fetchAllPages(username, token);
        if (!cancelled) {
          setItems(fresh);
          setCached(fresh);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load collection.";
          setError(message);
          setIsLoading(false);
          showToast({ style: Toast.Style.Failure, title: "Could not load collection", message });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username, token, refreshCount]);

  function refresh() {
    cache.remove(CACHE_KEY);
    setIsLoading(true);
    setError(null);
    setItems([]);
    setRefreshCount((n) => n + 1);
  }

  return { items, isLoading, error, refresh };
}
