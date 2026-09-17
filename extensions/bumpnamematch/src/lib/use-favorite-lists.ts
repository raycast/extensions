import { useEffect, useState } from "react";
import { type FavoriteList, type FavoriteListsResponse } from "./api";

/**
 * Load the user's favorite lists once, when an API key is configured. Used to
 * populate the "Add to List…" save actions. Returns an empty array when no key
 * is set or the request fails.
 */
export function useFavoriteLists(baseUrl: string, apiKey?: string): FavoriteList[] {
  const [lists, setLists] = useState<FavoriteList[]>([]);

  useEffect(() => {
    if (!apiKey) {
      setLists([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/favorite-lists`, { headers: { "x-api-key": apiKey } });
        if (res.ok && !cancelled) {
          const d = (await res.json()) as FavoriteListsResponse;
          setLists(d.lists ?? []);
        }
      } catch {
        // Leave lists empty; save actions degrade gracefully.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, baseUrl]);

  return lists;
}
