import { GameData, GameDataResponse, GameSimple } from "../types";

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
};

export type SteamGameSearchResult = {
  appid: number;
  name: string;
  storeUrl: string;
};

type SteamGameDetailsRequest = {
  appid: number;
  url: string;
};

type SteamGameSearchOptions = {
  cacheKey?: number;
  maxResults?: number;
};

const STEAM_STORE_BASE = "https://store.steampowered.com";
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

export function getSteamGameSearchUrl(term: string, cacheKey = 0) {
  const url = new URL(STEAM_SEARCH_BASE);
  url.searchParams.set("cacheKey", cacheKey.toString());
  url.searchParams.set("search", term);
  return url.toString();
}

export function getSteamGameDetailsUrl(appid: number) {
  const url = new URL(`${STEAM_STORE_BASE}/api/appdetails`);
  url.searchParams.set("appids", appid.toString());
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

export async function fetchSteamGames(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new SteamGameError(`${response.status} ${response.statusText}`, { status: response.status });
  }

  const games = (await response.json()) as GameSimple[];
  return games?.filter(hasAppId).map((game) => ({ appid: game.appid, name: game.name })) ?? [];
}

export async function fetchSteamGameData({ appid, url }: SteamGameDetailsRequest) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new SteamGameError(`${response.status} ${response.statusText}`, { status: response.status });
  }

  const gameData = (await response.json()) as GameDataResponse;
  if (!gameData?.[appid]?.success || !gameData?.[appid]?.data) {
    throw new SteamGameError("Game not found", { status: 404 });
  }

  return gameData[appid].data;
}

export async function searchSteamGames(input: string, options: SteamGameSearchOptions = {}) {
  const query = cleanSteamGameQuery(input);
  if (!query) return [];

  const url = getSteamGameSearchUrl(query, options.cacheKey);
  const games = await fetchSteamGames(url);
  return games.slice(0, options.maxResults ?? 20).map(toSteamGameSearchResult);
}

export async function getSteamGameData(appid: number) {
  return fetchSteamGameData({
    appid,
    url: getSteamGameDetailsUrl(appid),
  });
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
