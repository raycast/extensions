import { useEffect, useState, useRef, useCallback } from "react";
import { LocalStorage, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export function useFavorites(): [
  Set<string>,
  (favorites: Set<string>) => void,
  (id: string) => Promise<void>,
  (id: string) => Promise<void>,
  boolean,
] {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isLoaded = useRef(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    async function fetchFavorites() {
      try {
        const stored = await LocalStorage.getItem("favorites");
        const favoritesString = typeof stored === "string" ? stored : "[]";
        const parsed: string[] = JSON.parse(favoritesString);
        setFavorites(new Set(parsed));
      } catch (e) {
        console.error("Failed to parse favorites from local storage:", e);
        showFailureToast("Failed to load favorites");
        setFavorites(new Set());
      } finally {
        isLoaded.current = true;
        setIsInitialized(true);
      }
    }
    fetchFavorites();
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (!isLoaded.current) return;

    const saveToStorage = async () => {
      try {
        const json = JSON.stringify(Array.from(favorites));
        await LocalStorage.setItem("favorites", json);
      } catch (e) {
        console.error("Failed to save favorites to local storage:", e);
        showFailureToast("Failed to save favorites");
      }
    };

    saveToStorage();
  }, [favorites]);

  const addFavorite = useCallback(
    async (id: string) => {
      if (!isInitialized) {
        showFailureToast("Favorites not yet loaded", { title: "Please wait" });
        return;
      }

      setIsLoading(true);
      try {
        setFavorites((prev) => new Set([...prev, id]));
        showToast({ title: "Added to Favorites", message: "Cat image has been added to your favorites." });
      } catch (e) {
        console.error("Failed to add favorite:", e);
        showFailureToast("Failed to add to favorites");
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized],
  );

  const removeFavorite = useCallback(
    async (id: string) => {
      if (!isInitialized) {
        showFailureToast("Favorites not yet loaded", { title: "Please wait" });
        return;
      }

      setIsLoading(true);
      try {
        setFavorites((prev) => {
          const updated = new Set(prev);
          updated.delete(id);
          return updated;
        });
        showToast({ title: "Removed from Favorites", message: "Cat image has been removed from your favorites." });
      } catch (e) {
        console.error("Failed to remove favorite:", e);
        showFailureToast("Failed to remove from favorites");
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized],
  );

  return [favorites, setFavorites, addFavorite, removeFavorite, isLoading];
}
