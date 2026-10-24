import { LocalStorage } from "@raycast/api";

import { Anime } from "./anilist";

const WATCHLIST_KEY = "watchlist";

export type WatchlistAnime = Pick<
  Anime,
  | "id"
  | "title"
  | "coverImage"
  | "episodes"
  | "format"
  | "genres"
  | "averageScore"
  | "status"
  | "description"
  | "startDate"
  | "siteUrl"
  | "nextAiringEpisode"
  | "studios"
  | "trailer"
  | "externalLinks"
>;

export async function getWatchlist() {
  const value = await LocalStorage.getItem<string>(WATCHLIST_KEY);
  return value ? (JSON.parse(value) as WatchlistAnime[]) : [];
}

export async function saveAnime(anime: Anime) {
  const watchlist = await getWatchlist();
  const nextWatchlist = [anime, ...watchlist.filter((item) => item.id !== anime.id)];
  await LocalStorage.setItem(WATCHLIST_KEY, JSON.stringify(nextWatchlist));
}

export async function removeAnime(animeId: number) {
  const watchlist = await getWatchlist();
  await LocalStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist.filter((item) => item.id !== animeId)));
}

export async function isAnimeSaved(animeId: number) {
  const watchlist = await getWatchlist();
  return watchlist.some((item) => item.id === animeId);
}
