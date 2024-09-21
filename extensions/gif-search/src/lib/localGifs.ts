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

  const favoritesFavs = new Set(await get("favorites", type));
  favoritesFavs.add(service + ":" + gif.id.toString());

  return Promise.all([
    LocalStorage.setItem(getKey(service, type), JSON.stringify(Array.from(favs))),
    LocalStorage.setItem(getKey("favorites", type), JSON.stringify(Array.from(favoritesFavs))),
  ]);
}

export async function remove(gif: IGif, service: ServiceName, type: LocalType) {
  const favoritesFavs = new Set(await get("favorites", type));
  let deleteFavoritesFavsService: ServiceName = service;
  for (const favs of favoritesFavs) {
    if (favs.split(":")[1] === gif.id.toString()) {
      deleteFavoritesFavsService = favs.split(":")[0] as ServiceName;
      favoritesFavs.delete(favs);
      break;
    }
  }

  const favs = new Set(await get(deleteFavoritesFavsService, type));
  favs.delete(gif.id.toString());

  return Promise.all([
    LocalStorage.setItem(getKey(deleteFavoritesFavsService, type), JSON.stringify(Array.from(favs))),
    LocalStorage.setItem(getKey("favorites", type), JSON.stringify(Array.from(favoritesFavs))),
  ]);
}
