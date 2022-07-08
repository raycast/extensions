import { LocalStorage } from "@raycast/api";
import { Location } from "..";
import { getNow, Now } from "./getNow";

const getStored = async (): Promise<Location[]> => {
  // get items from local storage
  return LocalStorage.getItem<string>("favorites").then((fav) => {
    if (fav) return JSON.parse(fav);
    return [];
  });
};

const setStored = async (items: Location[]): Promise<void> => {
  // save to storage
  LocalStorage.setItem("favorites", JSON.stringify(items));
};

export const getFavorites = async (time?: string): Promise<Now[]> => {
  return (await getStored()).map((item: Location) => getNow(time || new Date(), item));
};

export const isFavorite = (item: Now, favorites: Now[]): boolean => {
  return (
    favorites.find((currentItem: Location) => {
      return currentItem.city + "," + currentItem.country === item.city + "," + item.country;
    }) !== undefined
  );
};

export const addToFavorites = async (item: Now): Promise<Now[]> => {
  const currentState = await getFavorites();
  const newState = [...currentState, item];
  // set preferences
  await setStored(newState);
  //
  return newState;
};

export const moveFavorite = async (item: Now, direction: "up" | "down"): Promise<Now[]> => {
  const currentState = await getFavorites();
  // get from and to
  const from: number = currentState.findIndex(
    (currentItem) => item.city + "," + item.country === currentItem.city + "," + currentItem.country
  );
  let to: number = from;
  if (direction === "up" && from > 0) {
    to = from - 1;
  } else if (direction === "down" && from < currentState.length - 1) {
    to = from + 1;
  } else {
    return currentState;
  }
  // remove item
  currentState.splice(from, 1);
  // move item to new position
  currentState.splice(to, 0, item);
  // set preferences
  setStored(currentState);
  // return new states
  return currentState;
};

export const removeFromFavorites = async (item: Now): Promise<Now[]> => {
  const currentState = await getFavorites();
  const newState = currentState.filter(
    (currentItem: Now) => item.city + "," + item.country !== currentItem.city + "," + currentItem.country
  );
  // set preferences
  setStored(newState);

  return newState;
};
