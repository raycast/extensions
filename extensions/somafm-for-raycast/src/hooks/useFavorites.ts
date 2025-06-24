import { useEffect, useState } from "react";
import { getFavorites, toggleFavorite } from "../utils/storage";
import { showToast, Toast } from "@raycast/api";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    try {
      const storedFavorites = await getFavorites();
      setFavorites(storedFavorites);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFavoriteStation(stationId: string, stationTitle: string) {
    try {
      const isNowFavorite = await toggleFavorite(stationId);

      // Update local state
      if (isNowFavorite) {
        setFavorites([...favorites, stationId]);
      } else {
        setFavorites(favorites.filter((id) => id !== stationId));
      }

      // Show feedback
      await showToast({
        style: Toast.Style.Success,
        title: isNowFavorite ? "Added to Favorites" : "Removed from Favorites",
        message: stationTitle,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorites",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function isFavorite(stationId: string): boolean {
    return favorites.includes(stationId);
  }

  return {
    favorites,
    isLoading,
    toggleFavoriteStation,
    isFavorite,
  };
}
