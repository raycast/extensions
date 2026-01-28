import { useCachedState } from "@raycast/utils";
import { useCallback } from "react";
import { SearchResult } from "../types";

export function useFavoriteKaomoji() {
  const [favoriteKaomojis, setFavoriteKaomojis] = useCachedState<SearchResult[]>("favoriteKaomoji", []);

  const toggleFavorite = useCallback((kaomoji: SearchResult) => {
    setFavoriteKaomojis((prev) => {
      const existing = prev.findIndex((item) => item.id === kaomoji.id);
      if (existing !== -1) {
        // Remove from favorites
        return prev.filter((item) => item.id !== kaomoji.id);
      } else {
        // Add to favorites
        return [...prev, kaomoji];
      }
    });
  }, []);

  const isFavorite = useCallback(
    (kaomoji: SearchResult) => {
      return favoriteKaomojis.some((item) => item.id === kaomoji.id);
    },
    [favoriteKaomojis],
  );

  return {
    favoriteKaomojis,
    toggleFavorite,
    isFavorite,
  };
}
