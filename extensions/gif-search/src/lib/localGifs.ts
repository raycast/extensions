import { LocalStorage } from "@raycast/api";

import { getServices, ServiceName } from "../preferences";
import { IGif } from "../models/gif";

export type LocalType = "favs" | "recent";

function getKey(service: ServiceName, type: LocalType) {
  return `${service}-${type}`;
}

export async function clear(service: ServiceName, type: LocalType) {
  return await LocalStorage.removeItem(getKey(service, type));
}

export async function get(service: ServiceName, type: LocalType) {
  const favs = await LocalStorage.getItem<string>(getKey(service, type));
  const favsArr: string[] = JSON.parse(favs || "[]");
  return favsArr;
}

export async function getAll(type: LocalType) {
  const allFavs: [ServiceName, string[]][] = [];
  for (const service of getServices()) {
    const favs = await LocalStorage.getItem<string>(getKey(service, type));
    const favsArr: string[] = JSON.parse(favs || "[]");
    allFavs.push([service, favsArr]);
  }

  return allFavs;
}

export async function save(gif: IGif, service: ServiceName, type: LocalType) {
  const favs = new Set(await get(service, type));
  favs.add(gif.id.toString());
  return await LocalStorage.setItem(getKey(service, type), JSON.stringify(Array.from(favs)));
}

export async function remove(gif: IGif, service: ServiceName, type: LocalType) {
  const favs = new Set(await get(service, type));
  favs.delete(gif.id.toString());

  return await LocalStorage.setItem(getKey(service, type), JSON.stringify(Array.from(favs)));
}
