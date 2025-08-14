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
  setFavorites((prev) => {
    if (prev.has(id)) {
      showToast({ title: "Already in Favorites", message: "This cat image is already in your favorites." });
      return prev;
    }
    const updated = new Set([...prev, id]);
    showToast({ title: "Added to Favorites", message: "Cat image has been added to your favorites." });
    return updated;
  });
}

  async function removeFavorite(id: string) {
    setFavorites((prev) => {
      const updated = new Set(Array.from(prev).filter((fav) => fav !== id));
      return updated;
    });
    showToast({ title: "Removed from Favorites", message: "Cat image has been removed from your favorites." });
  }

  return [favorites, setFavorites, addFavorite, removeFavorite];
}
