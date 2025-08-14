import { useEffect, useState, useRef } from "react";
import { LocalStorage, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export function useFavorites(): [
  Set<string>,
  (favorites: Set<string>) => void,
  (id: string) => Promise<void>,
  (id: string) => Promise<void>,
] {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const isLoaded = useRef(false);

  useEffect(() => {
    async function fetchFavorites() {
      const stored = await LocalStorage.getItem("favorites");
      const favoritesString = typeof stored === "string" ? stored : "[]";
      try {
        const parsed: string[] = JSON.parse(favoritesString);
        setFavorites(new Set(parsed));
      } catch (e) {
        setFavorites(new Set());
        console.error("Failed to parse favorites from local storage:", e);
        showFailureToast("Failed to load favorites");
      } finally {
        isLoaded.current = true;
      }
    }
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (!isLoaded.current) return;
    const json = JSON.stringify(Array.from(favorites));
    (async () => {
      await LocalStorage.setItem("favorites", json);
    })();
  }, [favorites]);

  async function addFavorite(id: string) {
    const updated = new Set([...favorites, id]);
    await LocalStorage.setItem("favorites", JSON.stringify(Array.from(updated)));
    setFavorites(updated);
    showToast({ title: "Added to Favorites", message: "Cat image has been added to your favorites." });
  }

  async function removeFavorite(id: string) {
    const updated = new Set(Array.from(favorites).filter((fav) => fav !== id));
    await LocalStorage.setItem("favorites", JSON.stringify(Array.from(updated)));
    setFavorites(updated);
  }

  return [favorites, setFavorites, addFavorite, removeFavorite];
}
