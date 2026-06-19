import { LocalStorage } from "@raycast/api";

const STORAGE_KEYS = {
  selection: "make.selection.v1",
  favorites: "make.favorites.v1",
} as const;

export type MakeSelection = {
  organizationId: number;
  organizationName: string;
  teamId: number;
  teamName: string;
  apiLimitPerMinute?: number;
  apiLimitFetchedAtMs?: number;
  operationsLimit?: number;
  restartPeriod?: string;
};

export async function getSelection(): Promise<MakeSelection | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.selection);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as MakeSelection;
    if (
      typeof parsed?.organizationId !== "number" ||
      typeof parsed?.organizationName !== "string" ||
      typeof parsed?.teamId !== "number" ||
      typeof parsed?.teamName !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setSelection(selection: MakeSelection): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.selection, JSON.stringify(selection));
}

export async function clearSelection(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.selection);
}

// ── Favorites ──

export async function getFavorites(): Promise<number[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.favorites);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is number => typeof v === "number")
      : [];
  } catch {
    return [];
  }
}

export async function addFavorite(id: number): Promise<void> {
  const favs = await getFavorites();
  if (!favs.includes(id)) {
    favs.push(id);
    await LocalStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favs));
  }
}

export async function removeFavorite(id: number): Promise<void> {
  const favs = await getFavorites();
  const next = favs.filter((f) => f !== id);
  await LocalStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(next));
}

export function isFavorite(id: number, favorites: number[]): boolean {
  return favorites.includes(id);
}
