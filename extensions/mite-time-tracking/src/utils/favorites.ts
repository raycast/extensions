import { LocalStorage } from "@raycast/api";

const FAVORITES_KEY = "favoriteProjectIds";

export async function getFavoriteProjectIds(): Promise<number[]> {
  const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function toggleFavoriteProject(
  projectId: number | undefined,
): Promise<boolean> {
  if (!projectId) return false;

  const favorites = await getFavoriteProjectIds();
  const index = favorites.indexOf(projectId);

  if (index > -1) {
    // Remove from favorites
    favorites.splice(index, 1);
  } else {
    // Add to favorites
    favorites.push(projectId);
  }

  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return index === -1; // Return true if added, false if removed
}

export function isFavoriteProject(
  projectId: number | undefined,
  favorites: number[],
): boolean {
  return projectId ? favorites.includes(projectId) : false;
}
