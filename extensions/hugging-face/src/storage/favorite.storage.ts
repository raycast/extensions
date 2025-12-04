import { LocalStorage } from "@raycast/api";
import dedupe from "dedupe";
import type { Model } from "../models/models.model";
import { EntityType } from "../interfaces";

const LOCAL_STORAGE_KEY_MODEL = "huggingface-favorites-model";
const LOCAL_STORAGE_KEY_DATASET = "huggingface-favorites-dataset";

export const getFavorites = async (type: EntityType): Promise<Model[]> => {
  const favoritesFromStorage = await LocalStorage.getItem<string>(
    type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
  );
  const faves: Model[] = JSON.parse(favoritesFromStorage ?? "[]");
  return dedupe(faves);
};

export const addFavorite = async (item: Model, type: EntityType) => {
  const favorites = await getFavorites(type);
  const favoritesNew = [item, ...favorites];
  const updatedFavoritesList = [...new Set(favoritesNew)];

  await LocalStorage.setItem(
    type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
    JSON.stringify(updatedFavoritesList),
  );
  return await getFavorites(type);
};

const removeMatchingItemFromArray = (arr: Model[], item: Model): Model[] => {
  let i = 0;
  while (i < arr.length) {
    if (arr[i].id === item.id) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
};
export const removeItemFromFavorites = async (item: Model, type: EntityType) => {
  const favorites = await getFavorites(type);
  const updatedFavoritesList = removeMatchingItemFromArray(favorites, item);
  await LocalStorage.setItem(
    type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
    JSON.stringify(updatedFavoritesList),
  );
  return await getFavorites(type);
};

export const removeAllItemsFromFavorites = async (type: EntityType) => {
  await LocalStorage.setItem(
    type === EntityType.Model ? LOCAL_STORAGE_KEY_MODEL : LOCAL_STORAGE_KEY_DATASET,
    JSON.stringify([]),
  );
  return await getFavorites(type);
};
