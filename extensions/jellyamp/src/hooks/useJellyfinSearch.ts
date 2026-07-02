import { useState, useEffect, useRef, useMemo } from "react";
import { getArtists, searchItems } from "../lib/jellyfin";
import type { JellyfinItem, JellyfinItemType } from "../types";

const DEBOUNCE_MS = 300;

export interface UseSearchOptions {
  types: JellyfinItemType[];
  /** When false the hook skips all fetching. Defaults to true. */
  enabled?: boolean;
}

export interface UseSearchResult {
  items: JellyfinItem[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  search: (query: string) => void;
}

/**
 * Hook that wraps Jellyfin item search with debouncing.
 * Routes artist-only searches through the /Artists endpoint, which is the
 * only reliable way to list/search artists in Jellyfin.
 */
export function useJellyfinSearch(options: UseSearchOptions): UseSearchResult {
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");

  const latestRequestId = useRef(0);

  // Serialize types to a stable string so the effect doesn't fire on every render
  // (filterToTypes() returns a new array instance each time, which React sees as changed)
  const typesKey = useMemo(() => options.types.join(","), [options.types]);
  const isArtistsOnly = options.types.length === 1 && options.types[0] === "MusicArtist";

  useEffect(() => {
    if (options.enabled === false) {
      setIsLoading(false);
      return;
    }

    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(
      async () => {
        try {
          let resultItems: JellyfinItem[];
          let resultTotal: number;

          if (isArtistsOnly) {
            // Use the dedicated /Artists endpoint — the only reliable one for artists
            const artists = await getArtists(query || undefined);
            resultItems = artists;
            resultTotal = artists.length;
          } else {
            const result = await searchItems({
              query,
              types: options.types,
              limit: 50,
            });
            resultItems = result.Items;
            resultTotal = result.TotalRecordCount;
          }

          if (requestId === latestRequestId.current) {
            setItems(resultItems);
            setTotalCount(resultTotal);
          }
        } catch (e) {
          if (requestId === latestRequestId.current) {
            setError(e instanceof Error ? e : new Error(String(e)));
          }
        } finally {
          if (requestId === latestRequestId.current) {
            setIsLoading(false);
          }
        }
      },
      query ? DEBOUNCE_MS : 0,
    );

    return () => clearTimeout(timer);
  }, [query, isArtistsOnly, typesKey, options.enabled]);

  return { items, isLoading, error, totalCount, search: setQuery };
}
