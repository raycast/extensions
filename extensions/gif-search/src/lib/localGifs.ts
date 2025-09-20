import { LocalStorage } from "@raycast/api";

import { getServices, ServiceName } from "../preferences";
import { IGif } from "../models/gif";

export type LocalType = "favs" | "recent";

function getKey(service: ServiceName, type: LocalType) {
  return `${service}-${type}`;
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
  const gifs = new Set(await get(service, type));
  gifs.add(gif.id.toString());
  return LocalStorage.setItem(getKey(service, type), JSON.stringify(Array.from(gifs)));
}

export async function remove(gif: IGif, service: ServiceName, type: LocalType) {
  const gifs = new Set(await get(service, type));
  console.log(gif.title, service, type);
  gifs.delete(gif.id.toString());
  return LocalStorage.setItem(getKey(service, type), JSON.stringify(Array.from(gifs)));
}

export async function getAllFavIds(): Promise<string[]> {
  const allFavs = await getAll("favs");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return allFavs.flatMap(([_, ids]) => ids);
}

export async function getAllRecentIds(): Promise<string[]> {
  const allRecents = await getAll("recent");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return allRecents.flatMap(([_, ids]) => ids);
}
