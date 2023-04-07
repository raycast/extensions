import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";
import { SearchResult } from "./types";

export function useRecentKaomoji() {
  const [recentKaomojis, setRecentKaomojis] = useCachedState<SearchResult[]>("recentKaomoji", []);

  const addKaomoji = useCallback((kaomoji: SearchResult) => {
    setRecentKaomojis((prev) => {
      const existing = prev.findIndex((item) => item.name === kaomoji.name);
      if (existing !== -1) {
        prev.splice(existing, 1);
      }

      return [kaomoji, ...prev].slice(0, 16);
    });
  }, []);

  return {
    recentKaomojis,
    addKaomoji,
  };
}
