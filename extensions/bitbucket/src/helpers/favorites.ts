import { LocalStorage } from "@raycast/api";

const FAVORITE_REPOS_KEY = "favorite-repositories";

interface FavoriteRepository {
  uuid: string;
  slug: string;
  fullName: string;
}

export async function getFavoriteRepositories(): Promise<FavoriteRepository[]> {
  const storedFavorites = await LocalStorage.getItem<string>(FAVORITE_REPOS_KEY);
  return storedFavorites ? JSON.parse(storedFavorites) : [];
}

export async function isRepositoryFavorite(uuid: string): Promise<boolean> {
  const favorites = await getFavoriteRepositories();
  return favorites.some((repo) => repo.uuid === uuid);
}

export async function toggleFavoriteRepository({ uuid, slug, fullName }: FavoriteRepository): Promise<boolean> {
  const favorites = await getFavoriteRepositories();
  const existingIndex = favorites.findIndex((repo) => repo.uuid === uuid);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    await LocalStorage.setItem(FAVORITE_REPOS_KEY, JSON.stringify(favorites));
    return false;
  } else {
    favorites.push({ uuid, slug, fullName });
    await LocalStorage.setItem(FAVORITE_REPOS_KEY, JSON.stringify(favorites));
    return true;
  }
}
