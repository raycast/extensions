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
  const id = gif.id.toString();
  const existing = (await get(service, type)).filter((existingId) => existingId !== id);
  const updated = type === "recent" ? [id, ...existing] : [...existing, id];
  return LocalStorage.setItem(getKey(service, type), JSON.stringify(updated));
}

export async function remove(gif: IGif, service: ServiceName, type: LocalType) {
  const gifs = new Set(await get(service, type));
  gifs.delete(gif.id.toString());
  return LocalStorage.setItem(getKey(service, type), JSON.stringify(Array.from(gifs)));
}

/**
 * Reads membership straight from storage, for decisions that must not use a value captured
 * before an await — a copy started while a GIF was favorited would otherwise write a cache
 * entry after the user removed it.
 */
export async function isSavedNow(gif: IGif, service: ServiceName, type: LocalType) {
  return (await get(service, type)).includes(gif.id.toString());
}

/**
 * Whether a GIF is saved under its own provider. IDs are only unique within a service, so a
 * flattened membership test can report a GIF as saved because an unrelated provider happens to
 * use the same ID — which would also authorize caching its bytes.
 */
export function isSaved(entries: [ServiceName, string[]][] | undefined, service: ServiceName | null, id: string) {
  if (!entries || !service) {
    return false;
  }
  return entries.some(([entryService, ids]) => entryService === service && ids.includes(id));
}
