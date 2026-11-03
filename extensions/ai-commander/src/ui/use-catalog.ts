import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { refKey } from "../catalog/build";
import { createCatalogStore } from "../catalog/cache";
import { loadCatalog } from "../catalog/load";
import { routeModel, visibleEntries } from "../catalog/routing";
import { getApiKeys } from "../core/preferences";
import type { CatalogEntry, ModelRef, ProviderId } from "../core/types";
import { getFavorites, toggleFavorite } from "../prompts/store";
import { PROVIDER_LABELS } from "../providers";
import { showError } from "./feedback";

export interface CatalogState {
  entries: CatalogEntry[];
  favorites: ModelRef[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  toggle: (ref: ModelRef) => Promise<void>;
}

/** Loads the cached catalog and refreshes it when it is older than 24 hours or on request. */
export function useCatalog(): CatalogState {
  // Read synchronously, so a form's first render already knows the stored model.
  const [entries, setEntries] = useState<CatalogEntry[]>(() =>
    visibleEntries(createCatalogStore().read().entries, getApiKeys()),
  );
  const [favorites, setFavorites] = useState<ModelRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (force: boolean) => {
    setIsLoading(true);
    try {
      const result = await loadCatalog({ keys: getApiKeys(), force });
      setEntries(result.entries);
      const failed = Object.entries(result.errors) as [ProviderId, string][];
      if (failed.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Some Models Could Not Be Refreshed",
          message: failed.map(([id, reason]) => `${PROVIDER_LABELS[id]}: ${reason}`).join(" "),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Favorites are stored by route. Showing them on the current route keeps them through a key change.
  const loadFavorites = useCallback(async () => {
    const keys = getApiKeys();
    try {
      setFavorites((await getFavorites()).map((ref) => routeModel(ref, keys)));
    } catch {
      // The model list works without favorites, and the views that need storage report the problem themselves.
    }
  }, []);

  useEffect(() => {
    void load(false);
    void loadFavorites();
  }, [load, loadFavorites]);

  const refresh = useCallback(() => load(true), [load]);
  const toggle = useCallback(
    async (ref: ModelRef) => {
      const keys = getApiKeys();
      const key = refKey(ref);
      try {
        const stored = (await getFavorites()).find((favorite) => refKey(routeModel(favorite, keys)) === key);
        await toggleFavorite(stored ?? ref);
        await loadFavorites();
      } catch (error) {
        await showError("Cannot Change Favorites", error);
      }
    },
    [loadFavorites],
  );

  return { entries, favorites, isLoading, refresh, toggle };
}
