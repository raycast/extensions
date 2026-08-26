import { State } from "@lib/haapi";
import { useCachedState } from "@raycast/utils";
import { useCallback, useMemo } from "react";

const CACHE_NAMESPACE = "entity-overrides";

export function partitionFavoriteStates(
  states: State[],
  favoriteEntityIds: Set<string>,
): { favorites: State[]; others: State[] } {
  const favorites: State[] = [];
  const others: State[] = [];
  for (const state of states) {
    if (favoriteEntityIds.has(state.entity_id)) {
      favorites.push(state);
    } else {
      others.push(state);
    }
  }
  return { favorites, others };
}

export function filterHiddenEntities(states: State[] | undefined, hiddenEntityIds: Set<string>): State[] | undefined {
  if (!states) {
    return states;
  }
  if (hiddenEntityIds.size === 0) {
    return states;
  }
  return states.filter((state) => !hiddenEntityIds.has(state.entity_id));
}

export function useEntityOverrides() {
  const [hiddenEntities, setHiddenEntities] = useCachedState<string[]>("hidden-entities", [], {
    cacheNamespace: CACHE_NAMESPACE,
  });
  const [entityAliases, setEntityAliases] = useCachedState<Record<string, string>>(
    "entity-aliases",
    {},
    {
      cacheNamespace: CACHE_NAMESPACE,
    },
  );
  const [favoriteEntities, setFavoriteEntities] = useCachedState<string[]>("favorite-entities", [], {
    cacheNamespace: CACHE_NAMESPACE,
  });

  const hiddenEntityIds = useMemo(() => new Set(hiddenEntities), [hiddenEntities]);
  const favoriteEntityIds = useMemo(() => new Set(favoriteEntities), [favoriteEntities]);

  const isHidden = useCallback(
    (entityId: string) => {
      return hiddenEntityIds.has(entityId);
    },
    [hiddenEntityIds],
  );

  const getAlias = useCallback(
    (entityId: string) => {
      return entityAliases[entityId];
    },
    [entityAliases],
  );

  const hideEntity = useCallback(
    (entityId: string) => {
      if (hiddenEntityIds.has(entityId)) {
        return;
      }
      setHiddenEntities((current) => [...current, entityId]);
    },
    [hiddenEntityIds, setHiddenEntities],
  );

  const showEntity = useCallback(
    (entityId: string) => {
      setHiddenEntities((current) => current.filter((id) => id !== entityId));
    },
    [setHiddenEntities],
  );

  const setAlias = useCallback(
    (entityId: string, name: string) => {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        setEntityAliases((current) => {
          const next = { ...current };
          delete next[entityId];
          return next;
        });
        return;
      }
      setEntityAliases((current) => ({ ...current, [entityId]: trimmed }));
    },
    [setEntityAliases],
  );

  const clearAlias = useCallback(
    (entityId: string) => {
      setEntityAliases((current) => {
        if (!(entityId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[entityId];
        return next;
      });
    },
    [setEntityAliases],
  );

  const isFavorite = useCallback(
    (entityId: string) => {
      return favoriteEntityIds.has(entityId);
    },
    [favoriteEntityIds],
  );

  const addFavorite = useCallback(
    (entityId: string) => {
      if (favoriteEntityIds.has(entityId)) {
        return;
      }
      setFavoriteEntities((current) => [...current, entityId]);
    },
    [favoriteEntityIds, setFavoriteEntities],
  );

  const removeFavorite = useCallback(
    (entityId: string) => {
      setFavoriteEntities((current) => current.filter((id) => id !== entityId));
    },
    [setFavoriteEntities],
  );

  const toggleFavorite = useCallback(
    (entityId: string) => {
      if (favoriteEntityIds.has(entityId)) {
        removeFavorite(entityId);
      } else {
        addFavorite(entityId);
      }
    },
    [favoriteEntityIds, addFavorite, removeFavorite],
  );

  return {
    hiddenEntities,
    hiddenEntityIds,
    favoriteEntities,
    favoriteEntityIds,
    entityAliases,
    isHidden,
    isFavorite,
    getAlias,
    hideEntity,
    showEntity,
    setAlias,
    clearAlias,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };
}
