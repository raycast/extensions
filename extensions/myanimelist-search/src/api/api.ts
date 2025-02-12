import { z } from "zod";
import fetch from "node-fetch";

import { clientId, getTokens } from "./oauth";
import { Cache } from "@raycast/api";

type AnimeStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";

const animeBody = z.object({
  id: z.number(),
  title: z.string(),
  main_picture: z.object({
    medium: z.string(),
    large: z.string(),
  }),
});

const extendedAnimeBody = animeBody.extend({
  alternative_titles: z.object({
    synonyms: z.array(z.string()),
    en: z.string(),
    ja: z.string(),
  }),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  synopsis: z.string(),
  mean: z.number().optional(),
  rank: z.number().optional(),
  popularity: z.number(),
  num_list_users: z.number(),
  num_scoring_users: z.number(),
  nsfw: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  media_type: z.string(),
  status: z.string(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  num_episodes: z.number(),
  start_season: z
    .object({
      year: z.number(),
      season: z.string(),
    })
    .optional(),
  average_episode_duration: z.number(),
  rating: z.string().optional(),
  studios: z.array(z.any()),
});

const animelistBody = z.object({
  data: z
    .array(
      z.object({
        node: animeBody,
      })
    )
    .optional(),
});

const animeSearchBody = z.object({
  data: z
    .array(
      z.object({
        node: extendedAnimeBody,
      })
    )
    .optional(),
});

export type Anime = z.infer<typeof animeBody>;

export type ExtendedAnime = z.infer<typeof extendedAnimeBody>;

const fields = [
  "id",
  "title",
  "main_picture",
  "alternative_titles",
  "start_date",
  "end_date",
  "synopsis",
  "mean",
  "rank",
  "popularity",
  "num_list_users",
  "num_scoring_users",
  "nsfw",
  "created_at",
  "updated_at",
  "media_type",
  "status",
  "genres",
  "my_list_status",
  "num_episodes",
  "start_season",
  "broadcast",
  "source",
  "average_episode_duration",
  "rating",
  "pictures",
  "background",
  "related_anime",
  "related_manga",
  "recommendations",
  "studios",
  "statistics",
];

const cache = new Cache();

type CacheEntry<T> = {
  data: T;
  expires: number;
};

export function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  const parsed = JSON.parse(entry) as CacheEntry<T>;
  if (parsed.expires < Date.now()) {
    cache.remove(key);
    return undefined;
  }

  return parsed.data;
}

export function cacheSet<T>(key: string, data: T, expires: number) {
  cache.set(key, JSON.stringify({ data, expires: Date.now() + expires }));
}

export function cacheRemove(key: string) {
  cache.remove(key);
}

export function removeCachedWatchlist() {
  // Hardcoding cause now I have to cope with my bad coding decisions ¯\_(ツ)_/¯
  cacheRemove("watchlist");
  (["watching", "plan_to_watch", "completed", "dropped", "on_hold"] as AnimeStatus[]).map((status) =>
    cacheRemove(`watchlist_${status}`)
  );
}

export async function request(
  url: string,
  body: string | undefined = undefined,
  method: "GET" | "PUT" | "POST" | "DELETE" = "GET"
): Promise<fetch.Response> {
  return fetch(url, {
    body,
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await getTokens())?.accessToken}`,
    },
  });
}

export async function request_anon(
  url: string,
  body: string | undefined = undefined,
  method: "GET" | "PUT" | "POST" | "DELETE" = "GET"
): Promise<fetch.Response> {
  return fetch(url, {
    body,
    method,
    headers: {
      "Content-Type": "application/json",
      "X-MAL-CLIENT-ID": clientId,
    },
  });
}

type SearchAnimeOptions = {
  nsfw?: boolean;
  anon?: boolean;
};

export async function fetchAnimes(
  search: string,
  { nsfw, anon }: SearchAnimeOptions
): Promise<ExtendedAnime[] | undefined> {
  const params = new URLSearchParams();
  params.append("q", search);
  params.append("limit", "30");
  params.append("nsfw", nsfw ? "true" : "false");
  params.append("fields", fields.join(","));

  const response = await (anon ? request_anon : request)("https://api.myanimelist.net/v2/anime?" + params);

  const json = await response.json();
  const parsed = animeSearchBody.safeParse(json);

  if (!parsed.success) {
    console.error("fetch items error:", parsed.error);
    throw new Error("Failed to parse response");
  }

  return parsed.data.data?.map((item) => item.node);
}

export async function fetchSuggestions({ nsfw, anon }: SearchAnimeOptions): Promise<ExtendedAnime[]> {
  const params = new URLSearchParams();
  params.append("limit", "30");
  params.append("nsfw", nsfw ? "true" : "false");
  params.append("fields", fields.join(","));

  const year = new Date().getFullYear();
  const season = ["winter", "spring", "summer", "fall"][Math.floor(new Date().getMonth() / 3)];

  const response = await (anon ? request_anon : request)(
    anon
      ? `https://api.myanimelist.net/v2/anime/season/${year}/${season}?${params}` // If the user is not signed in, get the current seasonal animes
      : "https://api.myanimelist.net/v2/anime/suggestions?" + params // If the user is signed in, get their usual suggestions
  );

  const json = await response.json();
  const parsed = animeSearchBody.safeParse(json);

  if (!parsed.success) {
    console.error("fetch items error:", parsed.error);
    throw new Error("Failed to parse response");
  }

  return parsed.data.data?.map((item) => item.node) ?? [];
}

export async function addAnime(anime: Anime) {
  const params = new URLSearchParams();
  params.append("status", "plan_to_watch");
  params.append("num_watched_episodes", "0");

  const res = await fetch(`https://api.myanimelist.net/v2/anime/${anime.id}/my_list_status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${(await getTokens())?.accessToken}`,
    },
    body: params,
  });

  if (!res.ok) {
    console.error("add anime error:", await res.text());
    throw new Error(res.statusText);
  }
}

export async function removeAnime(anime: Anime) {
  const res = await request(`https://api.myanimelist.net/v2/anime/${anime.id}/my_list_status`, undefined, "DELETE");

  if (!res.ok) {
    console.error("remove anime error:", await res.text());
    throw new Error(res.statusText);
  }
}

export async function getAnimeDetails(anime: Anime): Promise<ExtendedAnime> {
  const cacheKey = `anime_${anime.id}`;
  const cached = cacheGet<ExtendedAnime>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();
  params.append("fields", fields.join(","));

  const response = await request(`https://api.myanimelist.net/v2/anime/${anime.id}?${params}`);

  const json = await response.json();
  const parsed = extendedAnimeBody.safeParse(json);

  if (!parsed.success) {
    console.error("fetch items error:", parsed.error);
    throw new Error("Failed to parse response");
  }

  // Cache for 24 hours
  cacheSet(cacheKey, parsed.data, 1000 * 60 * 60 * 24);

  return parsed.data;
}

/**
 * Get the anime details from the user's list
 * **NOTE:** If the anime is not in the user's list, it will create a new entry. Only use this function if you are sure this is the users wish.
 */
export async function getAnimeEpisodesWatched(anime: Anime, allowCache: boolean = true): Promise<number> {
  const cacheKey = `episodes_${anime.id}`;
  const cached = allowCache && cacheGet<number>(cacheKey);
  if (cached) return cached;

  const res = await request(`https://api.myanimelist.net/v2/anime/${anime.id}/my_list_status`, undefined, "PUT");

  if (!res.ok) {
    console.error("get episodes watched error:", await res.text());
    throw new Error(res.statusText);
  }

  const json = await res.json();
  const episodes = json.num_episodes_watched ?? 0;

  // Cache for 5 minutes
  if (allowCache) cacheSet(cacheKey, episodes, 1000 * 60 * 60 * 1);

  return episodes;
}

export async function incrementEpisodes(anime: ExtendedAnime): Promise<number> {
  const episodes = await getAnimeEpisodesWatched(anime);

  const params = new URLSearchParams();
  params.append("num_watched_episodes", String(episodes + 1));
  params.append("status", episodes + 1 >= anime.num_episodes ? "completed" : "watching");

  const res = await fetch(`https://api.myanimelist.net/v2/anime/${anime.id}/my_list_status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${(await getTokens())?.accessToken}`,
    },
    body: params,
  });

  if (!res.ok) {
    console.error("increment episodes error:", await res.text());
    throw new Error(res.statusText);
  }

  await res.text();
  return episodes + 1;
}

export async function setEpisodes(anime: ExtendedAnime, episodes: number) {
  const params = new URLSearchParams();
  params.append("num_watched_episodes", String(episodes));
  params.append("status", episodes >= anime.num_episodes ? "completed" : "watching");

  const res = await fetch(`https://api.myanimelist.net/v2/anime/${anime.id}/my_list_status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${(await getTokens())?.accessToken}`,
    },
    body: params,
  });

  if (!res.ok) {
    console.error("set episodes error:", await res.text());
    throw new Error(res.statusText);
  }

  await res.text();
}

export async function getAnimeWatchlist(status?: AnimeStatus): Promise<Anime[]> {
  const cacheKey = status === undefined ? "watchlist" : "watchlist_" + status;
  const _cache = cacheGet<Anime[]>(cacheKey);
  if (_cache) return _cache;

  const params = new URLSearchParams();
  params.append("limit", "1000");
  if (status) params.append("status", status);

  const res = await request("https://api.myanimelist.net/v2/users/@me/animelist?" + params, undefined, "GET");

  if (!res.ok) {
    console.error("get watchlist error:", await res.text());
    throw new Error(res.statusText);
  }

  const json = await res.json();
  const parsed = animelistBody.safeParse(json);

  if (!parsed.success) {
    console.error("fetch items error:", parsed.error);
    throw new Error("Failed to parse response");
  }

  const data = parsed.data.data?.map((d) => d.node) ?? [];
  cacheSet(cacheKey, data as Anime[], 1000 * 60 * 10);

  return data;
}

export async function getDetailedWatchlist(statuses: AnimeStatus[]): Promise<(ExtendedAnime & { status: string })[]> {
  const getStatusCategory = async (status: AnimeStatus) => {
    const list = await getAnimeWatchlist(status);

    const animes = await Promise.all(list.map(async (anime) => ({ ...(await getAnimeDetails(anime)), status })));

    return animes;
  };

  const promises = await Promise.all(statuses.map(getStatusCategory));

  return [...promises.flat()];
}
