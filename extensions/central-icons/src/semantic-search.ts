import { useEffect, useRef, useState } from "react";
import { iconNameByDbName, type PackData } from "./icons";

const SEMANTIC_SEARCH_URL = "https://centralicons.com/search/semantic";
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 400;
const MAX_SUGGESTIONS = 24;

interface SemanticSearchResult {
  name: string;
}

/**
 * AI-powered fuzzy search, mirroring the website: debounced POST to the
 * centralicons.com semantic search endpoint (OpenAI embeddings + Supabase
 * vector search), mapped back to icon names via the metadata title.
 * Fails silently to no suggestions.
 */
export function useSemanticSearch(
  search: string,
  packData: PackData | null,
  exclude: Set<string>,
): { suggestions: string[]; isLoading: boolean } {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const excludeRef = useRef(exclude);
  excludeRef.current = exclude;

  useEffect(() => {
    const query = search.trim();
    if (!packData || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Set before the debounce so the grid never flashes an empty state while a
    // request is still pending for the current query.
    setIsLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(SEMANTIC_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((json) => {
          if (controller.signal.aborted) return;
          const byDbName = iconNameByDbName(packData);
          const suggestions: string[] = [];
          for (const item of (json as { data?: SemanticSearchResult[] }).data ?? []) {
            const iconName = byDbName.get(item.name);
            if (iconName && !excludeRef.current.has(iconName)) {
              suggestions.push(iconName);
              if (suggestions.length >= MAX_SUGGESTIONS) break;
            }
          }
          setResults(suggestions);
          setIsLoading(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, packData]);

  return { suggestions: results, isLoading };
}
