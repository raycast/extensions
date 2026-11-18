const ANILIST_API_URL = "https://graphql.anilist.co";
const ANILIST_REQUEST_INTERVAL_MS = 750;
const ANILIST_CACHE_TTL_MS = 5 * 60 * 1000;
const ANILIST_MAX_RETRIES = 3;

export type AnimeTitle = {
  romaji?: string;
  english?: string;
  native?: string;
};

export type AnimeDate = {
  year?: number;
  month?: number;
  day?: number;
};

export type ExternalLink = {
  site: string;
  url: string;
  icon?: string;
  color?: string;
};

export type Trailer = {
  id?: string;
  site?: string;
  thumbnail?: string;
};

export type Anime = {
  id: number;
  title: AnimeTitle;
  coverImage?: {
    large?: string;
    extraLarge?: string;
  };
  episodes?: number;
  format?: string;
  genres?: string[];
  averageScore?: number;
  status?: string;
  description?: string;
  startDate?: AnimeDate;
  siteUrl?: string;
  nextAiringEpisode?: {
    airingAt: number;
    episode: number;
  };
  studios?: {
    nodes: {
      name: string;
    }[];
  };
  trailer?: Trailer;
  externalLinks?: ExternalLink[];
};

export type AiringEpisode = {
  id: number;
  /** AniList returns airingAt as a Unix timestamp in seconds. */
  airingAt: number;
  episode: number;
  media: Anime;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const anilistCache = new Map<string, { expiresAt: number; data: unknown }>();
let nextAniListRequestAt = 0;

const MEDIA_FIELDS = `
  id
  title {
    romaji
    english
    native
  }
  coverImage {
    large
    extraLarge
  }
  episodes
  format
  genres
  averageScore
  status
  description(asHtml: false)
  startDate {
    year
    month
    day
  }
  siteUrl
  nextAiringEpisode {
    airingAt
    episode
  }
  studios(isMain: true) {
    nodes {
      name
    }
  }
  trailer {
    id
    site
    thumbnail
  }
  externalLinks {
    site
    url
    icon
    color
  }
`;

async function requestAniList<T>(query: string, variables: Record<string, unknown>) {
  const cacheKey = getAniListCacheKey(query, variables);
  const cached = anilistCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const data = await requestAniListWithRetry<T>(query, variables);
  anilistCache.set(cacheKey, { data, expiresAt: Date.now() + ANILIST_CACHE_TTL_MS });

  return data;
}

async function requestAniListWithRetry<T>(query: string, variables: Record<string, unknown>, attempt = 0): Promise<T> {
  await waitForAniListSlot();

  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  let json: GraphQLResponse<T> | undefined;

  try {
    json = (await response.json()) as GraphQLResponse<T>;
  } catch {
    json = undefined;
  }

  if (response.status === 429 && attempt < ANILIST_MAX_RETRIES) {
    await sleep(getAniListRetryDelay(response));
    return requestAniListWithRetry<T>(query, variables, attempt + 1);
  }

  if (!response.ok || json?.errors?.length) {
    throw new Error(json?.errors?.[0]?.message ?? getAniListErrorMessage(response.status));
  }

  if (!json?.data) {
    throw new Error("AniList returned an empty response");
  }

  if (Number(response.headers.get("X-RateLimit-Remaining") ?? "1") <= 1) {
    nextAniListRequestAt = Math.max(nextAniListRequestAt, Date.now() + ANILIST_REQUEST_INTERVAL_MS);
  }

  return json.data;
}

async function waitForAniListSlot() {
  const now = Date.now();
  const waitMs = Math.max(nextAniListRequestAt - now, 0);

  nextAniListRequestAt = Math.max(nextAniListRequestAt, now) + ANILIST_REQUEST_INTERVAL_MS;

  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

function getAniListRetryDelay(response: Response) {
  const retryAfter = Number(response.headers.get("Retry-After"));

  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1000;
  }

  const resetAt = Number(response.headers.get("X-RateLimit-Reset"));

  if (Number.isFinite(resetAt) && resetAt > 0) {
    return Math.max(resetAt * 1000 - Date.now(), ANILIST_REQUEST_INTERVAL_MS);
  }

  return 60 * 1000;
}

function getAniListCacheKey(query: string, variables: Record<string, unknown>) {
  return JSON.stringify({ query, variables });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAniListErrorMessage(status: number) {
  if (status >= 500) {
    return "AniList is temporarily unavailable. Try again in a moment.";
  }

  if (status === 429) {
    return "AniList rate limit reached. Try again in a moment.";
  }

  return `AniList request failed with status ${status}`;
}

export async function searchAnime(search: string) {
  if (!search.trim()) {
    return [];
  }

  const query = `
    query SearchAnime($search: String) {
      Page(page: 1, perPage: 20) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await requestAniList<{ Page: { media: Anime[] } }>(query, { search });
  return data.Page.media;
}

export async function getCurrentSeasonAnime(season: string, year: number) {
  const query = `
    query CurrentSeason($season: MediaSeason, $year: Int) {
      Page(page: 1, perPage: 50) {
        media(type: ANIME, season: $season, seasonYear: $year, status: RELEASING, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await requestAniList<{ Page: { media: Anime[] } }>(query, { season, year });
  return data.Page.media;
}

export async function getAiringEpisodes(startTimestamp: number, endTimestamp: number) {
  let page = 1;
  let hasNextPage = true;
  const airingSchedules: AiringEpisode[] = [];

  const query = `
    query AiringEpisodes($startTimestamp: Int, $endTimestamp: Int, $page: Int) {
      Page(page: $page, perPage: 50) {
        pageInfo {
          hasNextPage
        }
        airingSchedules(
          airingAt_greater: $startTimestamp
          airingAt_lesser: $endTimestamp
          sort: TIME
        ) {
          id
          airingAt
          episode
          media {
            ${MEDIA_FIELDS}
          }
        }
      }
    }
  `;

  while (hasNextPage) {
    const data = await requestAniList<{
      Page: {
        pageInfo: { hasNextPage: boolean };
        airingSchedules: AiringEpisode[];
      };
    }>(query, {
      startTimestamp,
      endTimestamp,
      page,
    });

    airingSchedules.push(...data.Page.airingSchedules);
    hasNextPage = data.Page.pageInfo.hasNextPage;
    page += 1;
  }

  return airingSchedules;
}

export function getAnimeTitle(anime: Anime) {
  return anime.title.english || anime.title.romaji || anime.title.native || "Untitled Anime";
}

export function getCrunchyrollLink(anime: Anime) {
  return anime.externalLinks?.find((link) => link.site.toLowerCase().includes("crunchyroll") && link.url)?.url;
}

export function hasCrunchyrollLink(anime: Anime) {
  return Boolean(getCrunchyrollLink(anime));
}

export const STREAMING_PLATFORMS = [
  { value: "crunchyroll", title: "Crunchyroll", matchers: ["crunchyroll"] },
  { value: "netflix", title: "Netflix", matchers: ["netflix"] },
  { value: "disney", title: "Disney+", matchers: ["disney"] },
  { value: "hulu", title: "Hulu", matchers: ["hulu"] },
  { value: "hidive", title: "HIDIVE", matchers: ["hidive"] },
  { value: "prime-video", title: "Prime Video", matchers: ["amazon", "prime video"] },
] as const;

export type StreamingPlatformFilter = "all" | (typeof STREAMING_PLATFORMS)[number]["value"];

export function getStreamingLinks(anime: Anime) {
  return (
    anime.externalLinks?.filter((link) =>
      STREAMING_PLATFORMS.some((platform) =>
        platform.matchers.some((matcher) => link.site.toLowerCase().includes(matcher)),
      ),
    ) ?? []
  );
}

export function getTrailerUrl(anime: Anime) {
  if (!anime.trailer?.id || !anime.trailer.site) return undefined;

  const site = anime.trailer.site.toLowerCase();
  if (site === "youtube") return `https://www.youtube.com/watch?v=${anime.trailer.id}`;
  if (site === "dailymotion") return `https://www.dailymotion.com/video/${anime.trailer.id}`;

  return undefined;
}

export function hasStreamingPlatform(anime: Anime, platformFilter: StreamingPlatformFilter) {
  if (platformFilter === "all") return true;

  const platform = STREAMING_PLATFORMS.find((item) => item.value === platformFilter);
  if (!platform) return true;

  return Boolean(
    anime.externalLinks?.some((link) =>
      platform.matchers.some((matcher) => link.site.toLowerCase().includes(matcher) && link.url),
    ),
  );
}

export function filterAnimeByStreamingPlatform<T extends Anime>(anime: T[], platformFilter: StreamingPlatformFilter) {
  return anime.filter((item) => hasStreamingPlatform(item, platformFilter));
}

export function getEpisodeProgress(anime: Anime) {
  const total = anime.episodes;
  const aired = anime.nextAiringEpisode?.episode ? Math.max(anime.nextAiringEpisode.episode - 1, 0) : total;

  if (aired && total) return `${aired}/${total} episodes`;
  if (aired) return `${aired} episodes aired`;
  if (total) return `${total} episodes`;
  return "Episodes unknown";
}

export function getCurrentAnimeSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month >= 1 && month <= 3) return { season: "WINTER", year };
  if (month >= 4 && month <= 6) return { season: "SPRING", year };
  if (month >= 7 && month <= 9) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export function getLocalDayTimestamps(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(end.getTime() / 1000),
  };
}

export function getLastSevenDaysTimestamps(date = new Date()) {
  const end = new Date(date);
  end.setSeconds(0, 0);

  const start = new Date(end);
  start.setDate(end.getDate() - 7);

  return {
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(end.getTime() / 1000),
  };
}

export function getLocalDateFromAniListTimestamp(timestamp: number) {
  return new Date(timestamp * 1000);
}

export function formatAnimeDate(date?: AnimeDate) {
  if (!date?.year) return "Unknown";

  const month = date.month ? String(date.month).padStart(2, "0") : "??";
  const day = date.day ? String(date.day).padStart(2, "0") : "??";
  return `${date.year}-${month}-${day}`;
}

export function formatAiringTime(timestamp?: number) {
  if (!timestamp) return "Unknown";
  return getLocalDateFromAniListTimestamp(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatAiringClock(timestamp?: number) {
  if (!timestamp) return "Unknown";
  return getLocalDateFromAniListTimestamp(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatWeekday(timestamp?: number) {
  if (!timestamp) return "Schedule Unknown";
  return getLocalDateFromAniListTimestamp(timestamp).toLocaleDateString(undefined, { weekday: "long" });
}

export function formatAiringDay(timestamp?: number) {
  if (!timestamp) return "Unknown";
  return getLocalDateFromAniListTimestamp(timestamp).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
