import type { PlayerTarget, Profile } from "./profile";
import type { Platform } from "./regions";

/** A saved player. Icon and level are optional: a player saved from a match page has neither until their page loads. */
export interface Favorite {
  puuid: string;
  gameName: string;
  tagLine: string;
  platform?: Platform;
  profileIconId?: number;
  level?: number;
}

/**
 * Text as people type it: lower case, no accents, and Turkish dotless i treated as i. "Eniştenfb", "enistenfb" and
 * "ENİŞTENFB" all become the same string, so a name can be found without typing its special letters.
 */
export function fold(text: string): string {
  // U+0300-U+036F are the combining accents NFD splits off (ş → s + cedilla); U+0131 is the Turkish dotless i.
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i");
}

export function riotIdOf(favorite: Favorite): string {
  return favorite.tagLine ? `${favorite.gameName}#${favorite.tagLine}` : favorite.gameName;
}

/** Favorites whose Riot ID contains the text, in the order they were saved. Empty text keeps them all. */
export function matchFavorites(favorites: Favorite[], text: string): Favorite[] {
  const query = fold(text.trim());
  if (!query) return favorites;
  return favorites.filter((favorite) => fold(riotIdOf(favorite)).includes(query));
}

/**
 * The one favorite a typed name clearly means, or undefined. Used when a name is submitted without a tag, which
 * cannot be looked up on its own: an exact name wins, otherwise a name that is the only one starting with the text.
 * Two players with the same name (different tags) stay ambiguous, so the caller shows a list instead of guessing.
 */
export function pickFavorite(favorites: Favorite[], text: string): Favorite | undefined {
  const name = fold(text.split("#")[0].trim());
  if (!name) return undefined;

  const exact = favorites.filter((favorite) => fold(favorite.gameName) === name);
  if (exact.length > 0) return exact.length === 1 ? exact[0] : undefined;

  const prefixed = favorites.filter((favorite) => fold(favorite.gameName).startsWith(name));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

export function targetOf(favorite: Favorite): PlayerTarget {
  return {
    puuid: favorite.puuid,
    gameName: favorite.gameName,
    tagLine: favorite.tagLine,
    platform: favorite.platform,
  };
}

export function favoriteFrom(profile: Profile): Favorite {
  return {
    puuid: profile.puuid,
    gameName: profile.gameName,
    tagLine: profile.tagLine,
    platform: profile.platform,
    profileIconId: profile.profileIconId,
    level: profile.level,
  };
}

/** Adds the player at the end, or updates them in place so the order you built stays put. */
export function upsertFavorite(favorites: Favorite[], favorite: Favorite): Favorite[] {
  // Fields that are unknown right now (undefined) must not erase ones we already know.
  const known = Object.fromEntries(Object.entries(favorite).filter(([, value]) => value !== undefined)) as Favorite;
  return favorites.some((existing) => existing.puuid === favorite.puuid)
    ? favorites.map((existing) => (existing.puuid === favorite.puuid ? { ...existing, ...known } : existing))
    : [...favorites, known];
}

export function removeFavorite(favorites: Favorite[], puuid: string): Favorite[] {
  return favorites.filter((favorite) => favorite.puuid !== puuid);
}
