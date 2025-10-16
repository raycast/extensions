import { LocalStorage } from "@raycast/api";

interface FavoriteStop {
  id: string;
  name: string;
  type: "bus" | "train";
  stopName?: string;
}

const FAVORITES_KEY = "favorite_stops";

export async function getFavoriteStops(): Promise<FavoriteStop[]> {
  const favorites = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return favorites ? JSON.parse(favorites) : [];
}

export async function addFavoriteStop(stop: FavoriteStop): Promise<void> {
  const favorites = await getFavoriteStops();
  if (!favorites.some((f) => f.id === stop.id && f.type === stop.type)) {
    favorites.push(stop);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export async function removeFavoriteStop(id: string, type: "bus" | "train"): Promise<void> {
  const favorites = await getFavoriteStops();
  const updatedFavorites = favorites.filter((f) => !(f.id === id && f.type === type));
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
}

export async function isFavoriteStop(id: string, type: "bus" | "train"): Promise<boolean> {
  const favorites = await getFavoriteStops();
  return favorites.some((f) => f.id === id && f.type === type);
}

export async function renameFavoriteStop(id: string, type: "bus" | "train", newName: string): Promise<void> {
  const favorites = await getFavoriteStops();
  const stop = favorites.find((f) => f.id === id && f.type === type);
  if (stop) {
    stop.name = newName;
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}
