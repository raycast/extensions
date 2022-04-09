import { LocalStorage } from "@raycast/api";

import { ServiceName } from "../preferences";
import { IGif } from "../models/gif";

export function getKey(service: ServiceName) {
  return `${service}-favs`;
}

export function setFavorites(ids: Set<string>, service: ServiceName) {
  return LocalStorage.setItem(getKey(service), JSON.stringify([...(ids || [])]));
}

export async function clearFavorites(service: ServiceName) {
  return await LocalStorage.removeItem(getKey(service));
}

export async function getFavorites(service: ServiceName) {
  const favs = await LocalStorage.getItem<string>(getKey(service));
  const favsArr: string[] = JSON.parse(favs || "[]");

  return new Set(favsArr);
}

export async function saveToFavorites(gif: IGif, service: ServiceName) {
  const favs = await getFavorites(service);
  favs.add(gif.id.toString());

  return await LocalStorage.setItem(service, JSON.stringify(Array.from(favs)));
}

export async function removeFromFavorites(gif: IGif, service: ServiceName) {
  const favs = await getFavorites(service);
  favs.delete(gif.id.toString());

  return await LocalStorage.setItem(service, JSON.stringify(favs));
}
