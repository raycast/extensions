import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useMemo, useRef } from "react";
import { refKey } from "../catalog/build";
import { createCatalogStore } from "../catalog/cache";
import { loadCatalog, type CatalogLoadResult } from "../catalog/load";
import { routeModel, visibleEntries } from "../catalog/routing";
import { errorMessage } from "../core/errors";
import { getApiKeys } from "../core/preferences";
import type { CatalogEntry, ModelRef, ProviderId } from "../core/types";
import { getFavorites, toggleFavorite } from "../prompts/store";
import { PROVIDER_LABELS } from "../providers";
import { showError } from "./feedback";

export interface CatalogState {
  entries: CatalogEntry[];
  favorites: ModelRef[];
  /** Why models may be missing: one line per provider that failed, or the error of the whole load. */
  problems: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  toggle: (ref: ModelRef) => Promise<void>;
}

const NO_FAVORITES: ModelRef[] = [];

function describeFailures(errors: CatalogLoadResult["errors"]): string[] {
  return (Object.entries(errors) as [ProviderId, string][]).map(([id, reason]) => `${PROVIDER_LABELS[id]}: ${reason}`);
}

/** Loads the cached catalog and refreshes it when it is older than 24 hours or on request. */
export function useCatalog(): CatalogState {
  // Read synchronously, so a form's first render already knows the stored model.
  const cached = useMemo(() => visibleEntries(createCatalogStore().read().entries, getApiKeys()), []);
  // Set by `refresh` for the next load only. Otherwise the cache decides what is due.
  const forceNext = useRef(false);

  const catalog = usePromise(
    () => {
      const force = forceNext.current;
      forceNext.current = false;
      return loadCatalog({ keys: getApiKeys(), force });
    },
    [],
    {
      onData: async ({ errors }) => {
        const failures = describeFailures(errors);
        if (failures.length === 0) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Some Models Could Not Be Refreshed",
          message: failures.join(" "),
        });
      },
      onError: (error) => showError("Cannot Load Models", error),
    },
  );

  // Favorites are stored by route. Showing them on the current route keeps them through a key change.
  const favorites = usePromise(
    async () => {
      const keys = getApiKeys();
      return (await getFavorites()).map((ref) => routeModel(ref, keys));
    },
    [],
    // The model list works without favorites, and the views that need storage report the problem themselves.
    { onError: () => undefined },
  );

  const { revalidate: reloadCatalog } = catalog;
  const { revalidate: reloadFavorites } = favorites;

  const refresh = useCallback(async () => {
    forceNext.current = true;
    try {
      await reloadCatalog();
    } catch {
      // `onError` has reported it.
    }
  }, [reloadCatalog]);

  const toggle = useCallback(
    async (ref: ModelRef) => {
      const keys = getApiKeys();
      const key = refKey(ref);
      try {
        const stored = (await getFavorites()).find((favorite) => refKey(routeModel(favorite, keys)) === key);
        await toggleFavorite(stored ?? ref);
        await reloadFavorites();
      } catch (error) {
        await showError("Cannot Change Favorites", error);
      }
    },
    [reloadFavorites],
  );

  const problems = useMemo(
    () => (catalog.error ? [errorMessage(catalog.error)] : describeFailures(catalog.data?.errors ?? {})),
    [catalog.error, catalog.data],
  );

  return {
    entries: catalog.data?.entries ?? cached,
    favorites: favorites.data ?? NO_FAVORITES,
    problems,
    isLoading: catalog.isLoading,
    refresh,
    toggle,
  };
}
