import { useEffect, useRef, useState } from "react";
import { getFavoriteIds, setFavoriteIds, toggleFavoriteId } from "../lib/favorites";
import { AgentId } from "../lib/types";

export function useFavoriteIds(): {
  favoriteIds: AgentId[];
  toggleFavorite: (id: AgentId) => void;
} {
  const [favoriteIds, setFavoriteIdsState] = useState<AgentId[]>([]);
  const pendingToggles = useRef<AgentId[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getFavoriteIds().then((stored) => {
      if (cancelled) {
        return;
      }
      const pending = pendingToggles.current;
      pendingToggles.current = [];
      let next = stored;
      for (const id of pending) {
        next = toggleFavoriteId(next, id);
      }
      loadedRef.current = true;
      setFavoriteIdsState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      return;
    }
    void setFavoriteIds(favoriteIds);
  }, [favoriteIds]);

  const toggleFavorite = (id: AgentId) => {
    if (!loadedRef.current) {
      pendingToggles.current.push(id);
    }
    setFavoriteIdsState((current) => toggleFavoriteId(current, id));
  };

  return { favoriteIds, toggleFavorite };
}
