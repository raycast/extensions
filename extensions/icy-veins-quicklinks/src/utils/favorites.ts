import { LocalStorage, showHUD } from "@raycast/api";
import { specs } from "../data/specs";
import type { SpecEntry } from "../types";

const STORAGE_KEY = "favorites";
const MAX_FAVORITES = 5;

export async function getFavoriteSlugs(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function getFavoriteSpecs(): Promise<SpecEntry[]> {
  const slugs = await getFavoriteSlugs();
  return slugs
    .map((slug) => specs.find((s) => s.slug === slug))
    .filter((s): s is SpecEntry => s !== undefined);
}

export async function isFavorite(specSlug: string): Promise<boolean> {
  const slugs = await getFavoriteSlugs();
  return slugs.includes(specSlug);
}

export async function addFavorite(specSlug: string): Promise<void> {
  const slugs = await getFavoriteSlugs();
  if (slugs.includes(specSlug)) return;
  const updated = [specSlug, ...slugs].slice(0, MAX_FAVORITES);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  await showHUD("Added to Favorites");
}

export async function removeFavorite(specSlug: string): Promise<void> {
  const slugs = await getFavoriteSlugs();
  const updated = slugs.filter((s) => s !== specSlug);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  await showHUD("Removed from Favorites");
}

export async function toggleFavorite(specSlug: string): Promise<void> {
  if (await isFavorite(specSlug)) {
    await removeFavorite(specSlug);
  } else {
    await addFavorite(specSlug);
  }
}
