import { LocalStorage } from "@raycast/api";

import { getServices, ServiceName } from "../preferences";
import { IGif } from "../models/gif";
import { GifIds, StoredGifIds } from "../hooks/useGifPopulator";

export type LocalType = "favs" | "recent";

function getKey(service: ServiceName, type: LocalType) {
  return `${service}-${type}`;
}

export function set(ids: GifIds, service: ServiceName, type: LocalType) {
  return LocalStorage.setItem(getKey(service, type), JSON.stringify([...(ids || [])]));
}

export async function clear(service: ServiceName, type: LocalType) {
  return await LocalStorage.removeItem(getKey(service, type));
}

export async function clearAll(type: LocalType) {
  for (const service of (await getAll(type)).keys()) {
    await LocalStorage.removeItem(getKey(service, type));
  }
}

export async function get(service: ServiceName, type: LocalType) {
  const favs = await LocalStorage.getItem<string>(getKey(service, type));
  const favsArr: string[] = JSON.parse(favs || "[]");

  return new Set(favsArr);
}

export async function getAll(type: LocalType) {
  const allFavs: StoredGifIds = new Map();

  for (const service of getServices()) {
    const favs = await LocalStorage.getItem<string>(getKey(service, type));
    const favsArr: string[] = JSON.parse(favs || "[]");
    allFavs.set(service, new Set(favsArr));
  }

  return allFavs;
}

export async function save(gif: IGif, service: ServiceName, type: LocalType) {
  const favs = await get(service, type);
  favs.add(gif.id.toString());

  return await LocalStorage.setItem(service, JSON.stringify(Array.from(favs)));
}

export async function remove(gif: IGif, service: ServiceName, type: LocalType) {
  const favs = await get(service, type);
  favs.delete(gif.id.toString());

  return await LocalStorage.setItem(service, JSON.stringify(favs));
}
