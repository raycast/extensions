import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { TwingateStorage } from "../utils/storage";
import { DebugLogger } from "../utils/debug";

interface UseFavoritesOptions {
  pinToTop?: boolean; // Whether favorites should be pinned to the top of the list
}

interface UseFavoritesReturn {
  favorites: Set<string>;
  toggleFavorite: (id: string, name: string) => Promise<void>;
  sortWithFavorites: <T extends { id: string }>(
    items: T[],
    defaultSort?: (a: T, b: T) => number,
  ) => T[];
}

export function useFavorites(
  options: UseFavoritesOptions = {},
): UseFavoritesReturn {
  const { pinToTop = false } = options;
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Initialize favorites
  useEffect(() => {
    const initializeFavorites = async () => {
      try {
        const favs = await TwingateStorage.getFavorites();
        setFavorites(new Set(favs.map((f) => f.id)));
        DebugLogger.debug("Favorites initialized", {
          favoriteCount: favs.length,
          pinToTop,
        });
      } catch (error) {
        DebugLogger.error("Failed to initialize favorites", error);
      }
    };

    initializeFavorites();
  }, [pinToTop]);

  const toggleFavorite = async (id: string, name: string) => {
    try {
      if (favorites.has(id)) {
        await TwingateStorage.removeFavorite(id);
        setFavorites((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        showToast({
          style: Toast.Style.Success,
          title: "Removed from Favorites",
          message: name,
        });
      } else {
        await TwingateStorage.addFavorite(id, name);
        setFavorites((prev) => new Set([...prev, id]));
        showToast({
          style: Toast.Style.Success,
          title: "Added to Favorites",
          message: name,
        });
      }
    } catch (error) {
      DebugLogger.error("Failed to toggle favorite", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Favorite",
        message: "Please try again",
      });
    }
  };

  const sortWithFavorites = <T extends { id: string }>(
    items: T[],
    defaultSort?: (a: T, b: T) => number,
  ): T[] => {
    if (!pinToTop) {
      // If not pinning to top, just use the default sort
      return defaultSort ? items.sort(defaultSort) : items;
    }

    // Pin favorites to top, then apply default sort within each group
    return items.sort((a, b) => {
      const aIsFavorite = favorites.has(a.id);
      const bIsFavorite = favorites.has(b.id);

      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // If both are favorites or both are not favorites, use default sort
      return defaultSort ? defaultSort(a, b) : 0;
    });
  };

  return {
    favorites,
    toggleFavorite,
    sortWithFavorites,
  };
}
