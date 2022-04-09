import { LocalStorage } from "@raycast/api";

import { ServiceName } from "../preferences";
import { IGif } from "../models/gif";

export async function saveToFavorites(gif: IGif, service: ServiceName) {
  const favs = await getFavorites(service);
  favs.add(gif.id.toString());

  return await LocalStorage.setItem(service, JSON.stringify(Array.from(favs)));
}

export async function getFavorites(service: ServiceName) {
  const favs = await LocalStorage.getItem<string>(service);
  const favsArr: string[] = JSON.parse(favs || "[]");

  return new Set(favsArr);
}

export async function removeFromFavorites(gif: IGif, service: ServiceName) {
  const favs = await getFavorites(service);
  favs.delete(gif.id.toString());

  return await LocalStorage.setItem(service, JSON.stringify(favs));
}
