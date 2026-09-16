import { LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { Person } from "./google";

const FAVORITES_KEY = "favorite-people";
const LAST_USED_KEY = "last-used-person";

export async function getFavorites(): Promise<Person[]> {
  const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as Person[];
  } catch {
    return [];
  }
}

export async function saveFavorites(favorites: Person[]) {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export async function addFavorite(person: Person) {
  const favorites = await getFavorites();
  if (favorites.some((f) => f.email === person.email)) return favorites;
  const updated = [...favorites, person];
  await saveFavorites(updated);
  return updated;
}

export async function removeFavorite(email: string) {
  const favorites = await getFavorites();
  const updated = favorites.filter((f) => f.email !== email);
  await saveFavorites(updated);
  return updated;
}

export async function getLastUsed(): Promise<Person | null> {
  const stored = await LocalStorage.getItem<string>(LAST_USED_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Person;
  } catch {
    return null;
  }
}

export async function saveLastUsed(person: Person) {
  await LocalStorage.setItem(LAST_USED_KEY, JSON.stringify(person));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Person[]>([]);
  const [lastUsed, setLastUsed] = useState<Person | null>(null);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  useEffect(() => {
    (async () => {
      const [favs, last] = await Promise.all([getFavorites(), getLastUsed()]);
      setFavorites(favs);
      setLastUsed(last);
      setIsLoadingFavorites(false);
    })();
  }, []);

  const handleAddFavorite = useCallback(async (person: Person) => {
    const updated = await addFavorite(person);
    setFavorites(updated);
  }, []);

  const handleRemoveFavorite = useCallback(async (email: string) => {
    const updated = await removeFavorite(email);
    setFavorites(updated);
  }, []);

  const handleSetLastUsed = useCallback(async (person: Person) => {
    await saveLastUsed(person);
    setLastUsed(person);
  }, []);

  const isFavorite = useCallback(
    (email: string) => favorites.some((f) => f.email === email),
    [favorites],
  );

  return {
    favorites,
    lastUsed,
    isLoadingFavorites,
    handleAddFavorite,
    handleRemoveFavorite,
    handleSetLastUsed,
    isFavorite,
  };
}
