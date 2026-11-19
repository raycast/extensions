import { useLocalStorage } from "@raycast/utils";
import { useMemo } from "react";
import bundled from "../data/resorts.json";
import type { Resort } from "../types";

export type Elevations = { baseElevation: number; topElevation: number };

const BUNDLED = bundled as Resort[];
// Stable fallbacks while LocalStorage loads, so memos don't recompute every render.
const NO_IDS: string[] = [];
const NO_RESORTS: Resort[] = [];
const NO_OVERRIDES: Record<string, Elevations> = {};

/** All resorts (custom first, bundled with elevation overrides applied) plus favorites, from LocalStorage. */
export function useResorts() {
  const favoriteStore = useLocalStorage<string[]>("favorites", []);
  const customStore = useLocalStorage<Resort[]>("custom-resorts", []);
  const overrideStore = useLocalStorage<Record<string, Elevations>>("elevation-overrides", {});

  const favoriteIds = favoriteStore.value ?? NO_IDS;
  const custom = customStore.value ?? NO_RESORTS;
  const overrides = overrideStore.value ?? NO_OVERRIDES;

  const resorts = useMemo(
    () => [...custom, ...BUNDLED.map((r) => (overrides[r.id] ? { ...r, ...overrides[r.id] } : r))],
    [custom, overrides],
  );
  const byId = useMemo(() => new Map(resorts.map((r) => [r.id, r])), [resorts]);
  const favorites = useMemo(
    () => favoriteIds.map((id) => byId.get(id)).filter((r): r is Resort => r !== undefined),
    [favoriteIds, byId],
  );

  return {
    resorts,
    byId,
    favorites,
    isLoading: favoriteStore.isLoading || customStore.isLoading || overrideStore.isLoading,
    isFavorite: (id: string) => favoriteIds.includes(id),
    isCustom: (id: string) => custom.some((r) => r.id === id),
    hasOverride: (id: string) => id in overrides,
    toggleFavorite: (id: string) =>
      favoriteStore.setValue(favoriteIds.includes(id) ? favoriteIds.filter((f) => f !== id) : [...favoriteIds, id]),
    /** The first favorite is the one shown in the menu bar title. */
    makePrimaryFavorite: (id: string) => favoriteStore.setValue([id, ...favoriteIds.filter((f) => f !== id)]),
    saveCustom: (resort: Resort) =>
      customStore.setValue(
        custom.some((r) => r.id === resort.id)
          ? custom.map((r) => (r.id === resort.id ? resort : r))
          : [...custom, resort],
      ),
    deleteCustom: async (id: string) => {
      await customStore.setValue(custom.filter((r) => r.id !== id));
      await favoriteStore.setValue(favoriteIds.filter((f) => f !== id));
    },
    setOverride: (id: string, elevations: Elevations) => overrideStore.setValue({ ...overrides, [id]: elevations }),
    clearOverride: (id: string) => {
      const rest = { ...overrides };
      delete rest[id];
      return overrideStore.setValue(rest);
    },
  };
}

export type ResortStore = ReturnType<typeof useResorts>;
