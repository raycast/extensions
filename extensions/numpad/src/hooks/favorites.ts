import { useState, useEffect } from "react";
import { getStorageKey, storeKey } from "../services/storage";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);

  const save = (input: string) => {
    const repeated = favorites.find((i) => i === input);
    if (repeated || input.length === 0) return;
    setFavorites((p) => [...p, input]);
  };

  const unSave = (input: string) => {
    setFavorites((p) => p.filter((item) => item !== input));
  };

  const setOldData = async () => {
    const data = await getStorageKey();
    setFavorites(data);
  };

  const deleteAllSaves = () => setFavorites([]);

  useEffect(() => {
    setOldData();
  }, []);

  useEffect(() => {
    storeKey(favorites);
  }, [favorites]);

  return { favorites, save, unSave, deleteAllSaves };
};
