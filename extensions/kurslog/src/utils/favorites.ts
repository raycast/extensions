import { LocalStorage } from "@raycast/api";

// --- Favorite Directions ---

export interface FavoriteDirection {
  from: string;
  to: string;
}

export async function getFavoriteDirections(): Promise<FavoriteDirection[]> {
  const json = await LocalStorage.getItem<string>("favorite_directions");
  return json ? JSON.parse(json) : [];
}

export async function toggleFavoriteDirection(
  from: string,
  to: string,
): Promise<boolean> {
  const favs = await getFavoriteDirections();
  const idx = favs.findIndex((f) => f.from === from && f.to === to);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push({ from, to });
  }
  await LocalStorage.setItem("favorite_directions", JSON.stringify(favs));
  return idx < 0; // true = added, false = removed
}

export function isFavoriteDirection(
  favs: FavoriteDirection[],
  from: string,
  to: string,
): boolean {
  return favs.some((f) => f.from === from && f.to === to);
}

// --- Favorite Exchangers ---

export async function getFavoriteExchangers(): Promise<string[]> {
  const json = await LocalStorage.getItem<string>("favorite_exchangers");
  return json ? JSON.parse(json) : [];
}

export async function toggleFavoriteExchanger(
  internalUrl: string,
): Promise<boolean> {
  const favs = await getFavoriteExchangers();
  const idx = favs.indexOf(internalUrl);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(internalUrl);
  }
  await LocalStorage.setItem("favorite_exchangers", JSON.stringify(favs));
  return idx < 0;
}

// --- Blacklist Exchangers ---

export async function getBlacklistExchangers(): Promise<string[]> {
  const json = await LocalStorage.getItem<string>("blacklist_exchangers");
  return json ? JSON.parse(json) : [];
}

export async function toggleBlacklistExchanger(
  internalUrl: string,
): Promise<boolean> {
  const list = await getBlacklistExchangers();
  const idx = list.indexOf(internalUrl);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(internalUrl);
  }
  await LocalStorage.setItem("blacklist_exchangers", JSON.stringify(list));
  return idx < 0;
}
