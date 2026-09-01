import { LocalStorage } from "@raycast/api";

import { FavoriteItem } from "./types";

/** Версия в ключе: сменится схема — старое значение просто перестанет читаться. */
const KEY = "favorites.v1";

function isFavorite(value: unknown): value is FavoriteItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.secid === "string" && item.secid.length > 0 && typeof item.shortname === "string";
}

/** Битое значение в LocalStorage не должно ронять команду — читаем как пустой список. */
export async function getFavorites(): Promise<FavoriteItem[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavorite).map((item) => ({
      secid: item.secid,
      shortname: item.shortname,
      boardid: typeof item.boardid === "string" ? item.boardid : null,
    }));
  } catch {
    return [];
  }
}

async function save(items: FavoriteItem[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(items));
}

export async function toggleFavorite(item: FavoriteItem): Promise<FavoriteItem[]> {
  const current = await getFavorites();
  const exists = current.some((entry) => entry.secid === item.secid);
  const next = exists ? current.filter((entry) => entry.secid !== item.secid) : [...current, item];
  await save(next);
  return next;
}

export function isFavoriteSecid(favorites: FavoriteItem[], secid: string): boolean {
  return favorites.some((item) => item.secid === secid);
}
