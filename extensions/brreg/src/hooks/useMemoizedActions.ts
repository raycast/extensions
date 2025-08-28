import { useCallback } from "react";
import { Enhet } from "../types";

export function useMemoizedActions() {
  // Memoize the favorite IDs set for O(1) lookups
  const createFavoriteIdsSet = useCallback((favorites: Enhet[]) => {
    return new Set(favorites.map((f) => f.organisasjonsnummer));
  }, []);

  // Memoize the favorite by ID map for O(1) lookups
  const createFavoriteByIdMap = useCallback((favorites: Enhet[]) => {
    const map = new Map<string, Enhet>();
    for (const f of favorites) map.set(f.organisasjonsnummer, f);
    return map;
  }, []);

  // Memoize move indicators calculation
  const getMoveIndicators = useCallback((index: number, totalLength: number, showMoveIndicators: boolean) => {
    if (!showMoveIndicators) return [];

    const indicators = [];

    if (index > 0) {
      indicators.push({
        icon: "Icon.ArrowUp",
        text: "Move up",
        tooltip: "⌘⇧↑ to move up",
      });
    }

    if (index < totalLength - 1) {
      indicators.push({
        icon: "Icon.ArrowDown",
        text: "Move down",
        tooltip: "⌘⇧↓ to move down",
      });
    }

    return indicators;
  }, []);

  // Memoize entity icon calculation
  const getEntityIcon = useCallback((entity: Enhet) => {
    return entity.emoji || entity.faviconUrl;
  }, []);

  return {
    createFavoriteIdsSet,
    createFavoriteByIdMap,
    getMoveIndicators,
    getEntityIcon,
  };
}
