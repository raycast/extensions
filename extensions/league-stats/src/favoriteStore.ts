import { Action, LocalStorage } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { Favorite, favoriteFrom, removeFavorite, riotIdOf, upsertFavorite } from "./favorites";
import type { Profile } from "./profile";

// Keeps its original spelling on purpose: renaming the key would orphan favorites that are already saved.
const KEY = "favourite-players";

export async function readFavorites(): Promise<Favorite[]> {
  try {
    const raw = await LocalStorage.getItem<string>(KEY);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch {
    return [];
  }
}

async function writeFavorites(favorites: Favorite[]) {
  await LocalStorage.setItem(KEY, JSON.stringify(favorites));
}

/** Resolves to true when the player was newly added, false when they were already a favorite. */
export async function saveFavorite(favorite: Favorite): Promise<boolean> {
  const favorites = await readFavorites();
  const isNew = !favorites.some((existing) => existing.puuid === favorite.puuid);
  await writeFavorites(upsertFavorite(favorites, favorite));
  return isNew;
}

export async function deleteFavorite(puuid: string) {
  await writeFavorites(removeFavorite(await readFavorites(), puuid));
}

/**
 * Called when a player's page loads. If they are a favorite, their saved name (players rename), icon, and level are
 * refreshed. Resolves to whether they are a favorite.
 */
export async function syncFavorite(profile: Profile): Promise<boolean> {
  const favorites = await readFavorites();
  if (!favorites.some((favorite) => favorite.puuid === profile.puuid)) return false;
  await writeFavorites(upsertFavorite(favorites, favoriteFrom(profile)));
  return true;
}

/**
 * A quicklink whose name is the player's name and whose link opens this command on them. Once created in Raycast it
 * is found by typing the name into the root search bar, with no command name in front.
 */
export function quicklinkFor(favorite: Favorite): Action.CreateQuicklink.Props["quicklink"] {
  return {
    name: favorite.gameName,
    link: createDeeplink({ command: "search-player", arguments: { riotId: riotIdOf(favorite) } }),
  };
}
