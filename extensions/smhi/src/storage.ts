import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";

export interface SavedLocation {
  id: string;
  lat: number;
  lon: number;
  label: string;
  // Optional user-set name. Falls back to `label` (typically the Nominatim display name) when unset.
  nickname?: string;
}

export function locationTitle(location: SavedLocation): string {
  return location.nickname ?? location.label;
}

const FAVORITES_KEY = "smhi.favorites";
const RECENTS_KEY = "smhi.recents";
const RECENTS_LIMIT = 25;

export function locationId(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function makeLocation(lat: number, lon: number, label: string): SavedLocation {
  return { id: locationId(lat, lon), lat, lon, label };
}

// Why: `useLocalStorage` returns `value | undefined`. Doing `value ?? []` inline creates
// a fresh array reference every render while loading, which propagates into useMemo deps
// downstream and triggers update loops in `useFrecencySorting`. A stable empty fallback fixes it.
const EMPTY: readonly SavedLocation[] = Object.freeze([]);

function useStableList(value: SavedLocation[] | undefined): SavedLocation[] {
  return useMemo(() => value ?? (EMPTY as SavedLocation[]), [value]);
}

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<SavedLocation[]>(FAVORITES_KEY, []);
  const favorites = useStableList(value);
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const addFavorite = useCallback(
    async (location: SavedLocation) => {
      const current = favoritesRef.current;
      if (current.some((f) => f.id === location.id)) return;
      await setValue([...current, location]);
    },
    [setValue],
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      await setValue(favoritesRef.current.filter((f) => f.id !== id));
    },
    [setValue],
  );

  const moveFavorite = useCallback(
    async (id: string, direction: -1 | 1) => {
      const current = favoritesRef.current;
      const index = current.findIndex((f) => f.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      await setValue(next);
    },
    [setValue],
  );

  const renameFavorite = useCallback(
    async (id: string, nickname: string) => {
      const trimmed = nickname.trim();
      const next = favoritesRef.current.map((f) =>
        f.id === id ? { ...f, nickname: trimmed.length > 0 ? trimmed : undefined } : f,
      );
      await setValue(next);
    },
    [setValue],
  );

  return { favorites, isLoading, addFavorite, removeFavorite, moveFavorite, renameFavorite };
}

// Recents are tracked as a plain list; ordering is delegated to useFrecencySorting at the call site.
export function useRecents() {
  const { value, setValue, isLoading } = useLocalStorage<SavedLocation[]>(RECENTS_KEY, []);
  const recents = useStableList(value);
  const recentsRef = useRef(recents);
  useEffect(() => {
    recentsRef.current = recents;
  }, [recents]);

  const recordVisit = useCallback(
    async (location: SavedLocation) => {
      const current = recentsRef.current;
      const without = current.filter((r) => r.id !== location.id);
      const next = [location, ...without].slice(0, RECENTS_LIMIT);
      await setValue(next);
    },
    [setValue],
  );

  const forgetRecent = useCallback(
    async (id: string) => {
      await setValue(recentsRef.current.filter((r) => r.id !== id));
    },
    [setValue],
  );

  return { recents, isLoading, recordVisit, forgetRecent };
}
