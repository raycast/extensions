import { LocalStorage } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";

export function useSavedAssets() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [downloaded, setDownloaded] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([LocalStorage.getItem<string>("favorites"), LocalStorage.getItem<string>("downloaded")]).then(
      ([favs, downs]) => {
        try {
          if (favs) setFavorites(JSON.parse(favs));
        } catch {
          setFavorites([]);
        }
        try {
          if (downs) {
            const parsedDowns = JSON.parse(downs);
            // Migration: If it's an array, convert to object with empty paths
            if (Array.isArray(parsedDowns)) {
              const newDowns: Record<string, string> = {};
              parsedDowns.forEach((id) => {
                newDowns[id] = "";
              });
              setDownloaded(newDowns);
              LocalStorage.setItem("downloaded", JSON.stringify(newDowns));
            } else {
              setDownloaded(parsedDowns);
            }
          }
        } catch {
          setDownloaded({});
        }
        setIsLoading(false);
      },
    );
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const newFavorites = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];

      setFavorites(newFavorites);
      await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
    },
    [favorites],
  );

  const addDownloaded = useCallback(
    async (assetId: string, path: string) => {
      const newDownloaded = { ...downloaded, [assetId]: path };
      setDownloaded(newDownloaded);
      await LocalStorage.setItem("downloaded", JSON.stringify(newDownloaded));
    },
    [downloaded],
  );

  return {
    favorites,
    downloaded,
    toggleFavorite,
    addDownloaded,
    isLoading,
  };
}
