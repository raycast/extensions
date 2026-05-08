import { useCallback, useEffect, useState } from "react";
import {
  loadFavorites,
  toggleFavorite as toggleFavoriteStorage,
} from "./favorites";
import { VoicemeeterTarget } from "./types";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    const next = await loadFavorites();
    setFavorites(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFavorite = useCallback(async (target: VoicemeeterTarget) => {
    const isNowFavorite = await toggleFavoriteStorage(target);
    setFavorites((prev) => {
      const key = `${target.kind}:index:${target.index}`;
      const next = new Set(prev);
      if (isNowFavorite) next.add(key);
      else next.delete(key);
      return next;
    });
    return isNowFavorite;
  }, []);

  return { favorites, toggleFavorite, refresh };
}
