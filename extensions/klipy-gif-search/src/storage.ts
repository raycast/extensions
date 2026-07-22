import { LocalStorage } from "@raycast/api";
import type { GifItem } from "./types";

const KEYS = {
  favorites: "favorites-v1",
  recents: "recents-v1",
  local: "local-gifs-v1",
  folders: "local-folders-v1",
} as const;

async function read(key: string): Promise<GifItem[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GifItem[];
  } catch {
    return [];
  }
}

async function write(key: string, items: GifItem[]) {
  await LocalStorage.setItem(key, JSON.stringify(items));
}

export const getFavorites = () => read(KEYS.favorites);
export const getRecents = () => read(KEYS.recents);
export const getLocalGifs = () => read(KEYS.local);

export async function getLocalFolders(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.folders);
  if (!raw) return [];
  try {
    const folders = JSON.parse(raw) as unknown;
    return Array.isArray(folders)
      ? folders.filter((folder): folder is string => typeof folder === "string")
      : [];
  } catch {
    return [];
  }
}

export async function addLocalFolders(folders: string[]) {
  const unique = new Set([...(await getLocalFolders()), ...folders]);
  await LocalStorage.setItem(KEYS.folders, JSON.stringify(Array.from(unique)));
}

export async function removeLocalFolder(folder: string) {
  await LocalStorage.setItem(
    KEYS.folders,
    JSON.stringify((await getLocalFolders()).filter((item) => item !== folder)),
  );
  await write(
    KEYS.favorites,
    (await getFavorites()).filter((item) => item.watchedFolder !== folder),
  );
  await write(
    KEYS.recents,
    (await getRecents()).filter((item) => item.watchedFolder !== folder),
  );
}

export async function clearRecents() {
  await write(KEYS.recents, []);
}

export async function toggleFavorite(item: GifItem): Promise<boolean> {
  const items = await getFavorites();
  const exists = items.some((candidate) => candidate.id === item.id);
  await write(
    KEYS.favorites,
    exists
      ? items.filter((candidate) => candidate.id !== item.id)
      : [item, ...items],
  );
  return !exists;
}

export async function addRecent(item: GifItem) {
  const items = await getRecents();
  await write(
    KEYS.recents,
    [item, ...items.filter((candidate) => candidate.id !== item.id)].slice(
      0,
      50,
    ),
  );
}

export async function addLocalGifs(items: GifItem[]) {
  const current = await getLocalGifs();
  const ids = new Set(items.map((item) => item.id));
  await write(KEYS.local, [
    ...items,
    ...current.filter((item) => !ids.has(item.id)),
  ]);
}

export async function removeLocalGif(id: string) {
  await write(
    KEYS.local,
    (await getLocalGifs()).filter((item) => item.id !== id),
  );
  await write(
    KEYS.favorites,
    (await getFavorites()).filter((item) => item.id !== id),
  );
  await write(
    KEYS.recents,
    (await getRecents()).filter((item) => item.id !== id),
  );
}
