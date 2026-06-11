import { LocalStorage } from "@raycast/api";
import { VoicemeeterTarget } from "./types";

const FAVORITES_KEY = "vm.favorites.v1";

function targetKey(target: VoicemeeterTarget): string {
  return `${target.kind}:index:${target.index}`;
}

export function isFavorite(
  target: VoicemeeterTarget,
  favorites: Set<string>,
): boolean {
  return favorites.has(targetKey(target));
}

export function sortWithFavoritesFirst<T extends VoicemeeterTarget>(
  targets: T[],
  favorites: Set<string>,
): T[] {
  return [...targets].sort((a, b) => {
    const aFav = favorites.has(targetKey(a));
    const bFav = favorites.has(targetKey(b));
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.index - b.index;
  });
}

export async function loadFavorites(): Promise<Set<string>> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function saveFavorites(favorites: Set<string>): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

export async function toggleFavorite(
  target: VoicemeeterTarget,
): Promise<boolean> {
  const fav = await loadFavorites();
  const key = targetKey(target);
  if (fav.has(key)) {
    fav.delete(key);
  } else {
    fav.add(key);
  }
  await saveFavorites(fav);
  return fav.has(key);
}
