import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import type { Model } from "../models/models.model";
import { getFavorites } from "../storage/favorite.storage";
import { EntityType } from "../interfaces";

export const useFavorites = (type: EntityType): [Model[], () => Promise<void>] => {
  const [favorites, setFavorites] = useCachedState<Model[]>(type.toString(), []);

  const fetchFavorites = async () => {
    const favoriteItems = await getFavorites(type);
    setFavorites(favoriteItems);
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  return [favorites, fetchFavorites];
};
