import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

async function loadFavorites(): Promise<string[]> {
  const items = (await LocalStorage.getItem("favorites")) || "[]";
  return JSON.parse(<string>items) as string[];
}

async function saveFavorites(next: string[]) {
  await LocalStorage.setItem("favorites", JSON.stringify(next));
  return next;
}

export function useFavorites(): [string[], (input: string) => Promise<void>, (target: string) => Promise<void>] {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadFavorites().then((favorites) => setFavorites(favorites));
  }, []);

  async function addFavorite(input: string) {
    if (favorites.includes(input)) {
      return;
    }

    setFavorites(await saveFavorites([...favorites, input]));
  }

  async function removeFavorite(target: string) {
    setFavorites(await saveFavorites(favorites.filter((favorite) => favorite !== target)));
  }

  return [favorites, addFavorite, removeFavorite];
}
