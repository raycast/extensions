import { captureException, getPreferenceValues } from "@raycast/api";
import { GameData, GameDataResponse, GameSimple, SteamGameHit } from "../types";
import { steamFetch } from "./http";
import { storeCountry } from "./region";
import { indexAgeDays, isIndexReady, isIndexStale, refreshDays, searchIndex } from "./search-index";
import { getOwnedGames } from "./library";

export type SteamGameSummary = {
  appid: number;
  name: string;
  type?: string;
  storeUrl: string;
  releaseDate?: string;
  comingSoon?: boolean;
  isFree?: boolean;
  price?: string;
  discountPercent?: number;
  developers: string[];
  publishers: string[];
  platforms: string[];
  genres: string[];
  categories: string[];
  metacriticScore?: number;
  metacriticUrl?: string;
  website?: string;
  headerImage?: string;
  shortDescription?: string;
  howLongToBeatUrl: string;
  youtubeUrl: string;
};

export type SteamGameSearchResult = {
  appid: number;
  name: string;
  storeUrl: string;
};

type CommunityApp = {
  appid: string;
  name: string;
  icon?: string;
};

type SteamGameDetailsRequest = {
  appid: number;
  url: string;
};

type SteamGameSearchOptions = {
  maxResults?: number;
};

const STEAM_STORE_BASE = "https://store.steampowered.com";
const STEAM_COMMUNITY_BASE = "https://steamcommunity.com";
const STEAM_SEARCH_BASE = "https://steam-search.vercel.app/api/games";

export class SteamGameError extends Error {
  status?: number;

  constructor(message: string, options: { status?: number } = {}) {
    super(message);
    this.name = "SteamGameError";
    this.status = options.status;
  }
}

export function cleanSteamGameQuery(input: string) {
  let query = input.trim();
  const replacements = [
    /^tell me about (?:the )?(?:steam )?(?:game|app)\s+/i,
    /^tell me about\s+/i,
    /^what is (?:the )?(?:steam )?(?:game|app)\s+/i,
    /^search (?:for )?(?:the )?(?:steam )?(?:game|app)\s+/i,
    /^find (?:the )?(?:steam )?(?:game|app)\s+/i,
    /^look up (?:the )?(?:steam )?(?:game|app)\s+/i,
  ];

  for (const replacement of replacements) {
    query = query.replace(replacement, "");
  }

  return query.replace(/^["'`]+|["'`.,!?]+$/g, "").trim();
}

export function getSteamGameStoreUrl(appid: number) {
  return `${STEAM_STORE_BASE}/app/${appid}`;
}

export function getHowLongToBeatUrl(name: string) {
  return `https://howlongtobeat.com/?q=${encodeURIComponent(name)}`;
}

export function getYouTubeUrl(name: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} gameplay`)}`;
}

export function getSteamGameSearchUrl(term: string, cacheKey = 0) {
  const url = new URL(STEAM_SEARCH_BASE);
  url.searchParams.set("cacheKey", cacheKey.toString());
  url.searchParams.set("search", term);
  return url.toString();
}

export function getSteamGameDetailsUrl(appid: number) {
  const url = new URL(`${STEAM_STORE_BASE}/api/appdetails`);
  url.searchParams.set("appids", appid.toString());
  url.searchParams.set("l", "english");
  return url.toString();
}

export function getSteamAppIdFromInput(input: string) {
  const storeUrlMatch = input.match(/store\.steampowered\.com\/app\/(\d+)/i);
  if (storeUrlMatch?.[1]) return Number(storeUrlMatch[1]);

  const appIdMatch = input.match(/\b(?:steam\s+)?app(?:id)?\s*#?:?\s*(\d{1,10})\b/i);
  if (appIdMatch?.[1]) return Number(appIdMatch[1]);

  const trimmed = input.trim();
  if (/^\d{1,10}$/.test(trimmed)) return Number(trimmed);

  return undefined;
}

export async function fetchSteamGames(url: string): Promise<SteamGameHit[]> {
  const response = await steamFetch(url);
  if (!response.ok) {
    throw new SteamGameError(`${response.status} ${response.statusText}`, { status: response.status });
  }

  const games = (await response.json()) as GameSimple[];
  return (
    games?.filter(hasAppId).map((game) => ({ appid: game.appid, name: game.name ?? `Steam App ${game.appid}` })) ?? []
  );
}

export async function fetchSteamGameData({ url }: SteamGameDetailsRequest) {
  const response = await steamFetch(url);

  if (!response.ok) {
    throw new SteamGameError(`${response.status} ${response.statusText}`, { status: response.status });
  }

  const gameData = (await response.json()) as GameDataResponse;
  // Steam can key the reply by a related app's id, and only one app is ever requested
  const [entry] = Object.values(gameData ?? {});
  if (!entry?.success || !entry.data) {
    throw new SteamGameError("Game not found", { status: 404 });
  }

  return entry.data;
}

export async function fetchCommunityApps(term: string): Promise<SteamGameHit[]> {
  const response = await steamFetch(`${STEAM_COMMUNITY_BASE}/actions/SearchApps/${encodeURIComponent(term)}`);
  if (!response.ok) {
    throw new SteamGameError(`${response.status} ${response.statusText}`, { status: response.status });
  }
  const apps = (await response.json()) as CommunityApp[];
  return (apps ?? [])
    .map((app) => ({ appid: Number(app.appid), name: app.name, icon: app.icon }))
    .filter((app) => app.appid > 0 && app.name);
}

// Steam's keyless app search ranks well but returns at most 10 games; the backend supplies the rest
export async function searchSteamGameHits(term: string): Promise<SteamGameHit[]> {
  const sources = await Promise.allSettled([fetchCommunityApps(term), fetchSteamGames(getSteamGameSearchUrl(term))]);
  const fulfilled = sources.flatMap((source) => (source.status === "fulfilled" ? [source.value] : []));
  if (!fulfilled.length) throw (sources[0] as PromiseRejectedResult).reason;

  const hits = new Map<number, SteamGameHit>();
  for (const results of fulfilled) {
    for (const game of results) {
      const existing = hits.get(game.appid);
      hits.set(game.appid, { ...game, ...existing, icon: existing?.icon ?? game.icon });
    }
  }
  return [...hits.values()];
}

export function localListWarning() {
  try {
    if (!isIndexReady() || !isIndexStale(refreshDays())) return undefined;
    const days = Math.floor(indexAgeDays());
    return `The local Steam game list is ${days} day${days === 1 ? "" : "s"} old, so recent releases may be missing. The user can update it with Refresh Game List in Search Games, or by asking you to.`;
  } catch {
    return undefined;
  }
}

function searchLocal(query: string, limit: number) {
  try {
    return searchIndex(query, limit);
  } catch (error) {
    captureException(error);
    return [];
  }
}

export async function searchSteamGames(input: string, options: SteamGameSearchOptions = {}) {
  const query = cleanSteamGameQuery(input);
  if (!query) return [];

  const maxResults = options.maxResults ?? 20;
  if (getPreferenceValues<Preferences>().token?.trim()) {
    if (!isIndexReady()) {
      throw new Error("The Steam game list hasn't downloaded yet. Open Search Games once to download it.");
    }
    return searchLocal(query, maxResults).map(toSteamGameSearchResult);
  }
  const games = await searchSteamGameHits(query);
  return games.slice(0, maxResults).map(toSteamGameSearchResult);
}

export async function getSteamGameData(appid: number) {
  const url = new URL(getSteamGameDetailsUrl(appid));
  url.searchParams.set("cc", await storeCountry());
  return fetchSteamGameData({ appid, url: url.toString() });
}

export async function resolveSteamGame(input: string) {
  const query = cleanSteamGameQuery(input);
  const appid = getSteamAppIdFromInput(query);

  if (appid) {
    return {
      query,
      matchType: "appid" as const,
      game: toSteamGameSearchResult({ appid }),
      data: await getSteamGameData(appid),
    };
  }

  const [match] = await searchSteamGames(query, { maxResults: 1 });
  if (!match) {
    return {
      query,
      matchType: "search-result" as const,
      game: undefined,
      data: undefined,
    };
  }

  return {
    query,
    matchType: "search-result" as const,
    game: match,
    data: await getSteamGameData(match.appid),
  };
}

export function toSteamGameSummary(gameData: GameData): SteamGameSummary {
  return {
    appid: gameData.steam_appid,
    name: gameData.name,
    type: gameData.type,
    storeUrl: getSteamGameStoreUrl(gameData.steam_appid),
    releaseDate: gameData.release_date?.date,
    comingSoon: gameData.release_date?.coming_soon,
    isFree: gameData.is_free,
    price: gameData.price_overview?.final_formatted,
    discountPercent: gameData.price_overview?.discount_percent,
    developers: gameData.developers ?? [],
    publishers: gameData.publishers ?? [],
    platforms: Object.entries(gameData.platforms ?? {})
      .filter(([, supported]) => supported)
      .map(([platform]) => platform),
    genres: gameData.genres?.map((genre) => genre.description).filter(Boolean) ?? [],
    categories: gameData.categories?.map((category) => category.description).filter(Boolean) ?? [],
    metacriticScore: gameData.metacritic?.score,
    metacriticUrl: gameData.metacritic?.url,
    website: gameData.website,
    headerImage: gameData.header_image,
    shortDescription: cleanText(gameData.short_description),
    howLongToBeatUrl: getHowLongToBeatUrl(gameData.name),
    youtubeUrl: getYouTubeUrl(gameData.name),
  };
}

function toSteamGameSearchResult(game: { appid: number; name?: string }): SteamGameSearchResult {
  return {
    appid: game.appid,
    name: game.name ?? `Steam App ${game.appid}`,
    storeUrl: getSteamGameStoreUrl(game.appid),
  };
}

function hasAppId(game: GameSimple): game is GameSimple & { appid: number } {
  return Boolean(game?.appid);
}

function cleanText(value?: string) {
  return value?.replace(/\s+/g, " ").trim();
}

export async function resolveSteamGameById(appid: number) {
  // Delisted games have no store page but can still be in the user's library
  const name = await getSteamGameData(appid)
    .then((data) => data.name)
    .catch(async () => (await getOwnedGames().catch(() => undefined))?.games.find((g) => g.appid === appid)?.name);
  if (!name) throw new Error(`Steam has no game with app ID ${appid}.`);
  return { appid, name };
}
