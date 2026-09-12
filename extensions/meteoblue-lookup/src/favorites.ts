import { LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { LocationSearchResult } from "./types";

const FAVORITES_KEY = "favorite-locations";
const LAST_USED_KEY = "last-used-location";

export async function getFavorites(): Promise<LocationSearchResult[]> {
  const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as LocationSearchResult[];
  } catch {
    return [];
  }
}

export async function saveFavorites(favorites: LocationSearchResult[]) {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export async function addFavorite(location: LocationSearchResult) {
  const favorites = await getFavorites();
  if (favorites.some((f) => f.id === location.id)) return favorites;
  const updated = [...favorites, location];
  await saveFavorites(updated);
  return updated;
}

export async function removeFavorite(locationId: string) {
  const favorites = await getFavorites();
  const updated = favorites.filter((f) => f.id !== locationId);
  await saveFavorites(updated);
  return updated;
}

export async function isFavorite(locationId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((f) => f.id === locationId);
}

export async function getLastUsedLocation(): Promise<LocationSearchResult | null> {
  const stored = await LocalStorage.getItem<string>(LAST_USED_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LocationSearchResult;
  } catch {
    return null;
  }
}

export async function saveLastUsedLocation(location: LocationSearchResult) {
  await LocalStorage.setItem(LAST_USED_KEY, JSON.stringify(location));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<LocationSearchResult[]>([]);
  const [lastUsedLocation, setLastUsedLocation] =
    useState<LocationSearchResult | null>(null);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  useEffect(() => {
    (async () => {
      const [favs, lastUsed] = await Promise.all([
        getFavorites(),
        getLastUsedLocation(),
      ]);
      setFavorites(favs);
      setLastUsedLocation(lastUsed);
      setIsLoadingFavorites(false);
    })();
  }, []);

  const handleAddFavorite = useCallback(
    async (location: LocationSearchResult) => {
      const updated = await addFavorite(location);
      setFavorites(updated);
    },
    [],
  );

  const handleRemoveFavorite = useCallback(async (locationId: string) => {
    const updated = await removeFavorite(locationId);
    setFavorites(updated);
  }, []);

  const handleSetLastUsed = useCallback(
    async (location: LocationSearchResult) => {
      await saveLastUsedLocation(location);
      setLastUsedLocation(location);
    },
    [],
  );

  const isLocationFavorite = useCallback(
    (locationId: string) => favorites.some((f) => f.id === locationId),
    [favorites],
  );

  return {
    favorites,
    lastUsedLocation,
    isLoadingFavorites,
    handleAddFavorite,
    handleRemoveFavorite,
    handleSetLastUsed,
    isLocationFavorite,
  };
}
