import { getPreferenceValues } from "@raycast/api";
import { useState, useCallback, useRef } from "react";

interface OpenRouterModel {
  id: string;
  name: string;
  created: number;
}

interface ModelSearchResult {
  id: string;
  name: string;
}

export function useModelSearch() {
  const [searchResults, setSearchResults] = useState<ModelSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const searchModels = useCallback(async (query: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const preferences = getPreferenceValues<Preferences>();
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${preferences.openrouterApiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        setSearchResults([]);
        return;
      }

      const data = (await response.json()) as { data: OpenRouterModel[] };
      const lowerQuery = query.toLowerCase();

      const filtered = data.data
        .filter((m) => m.id.toLowerCase().includes(lowerQuery) || m.name.toLowerCase().includes(lowerQuery))
        .sort((a, b) => b.created - a.created)
        .slice(0, 30)
        .map((m) => ({ id: m.id, name: m.name }));

      setSearchResults(filtered);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setSearchResults([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  return { searchResults, isSearching, searchModels };
}
