import { getPreferenceValues } from "@raycast/api";
import { GameDataSimple } from "../types";

type SteamApiErrorOptions = {
  status?: number;
};

export class SteamApiError extends Error {
  status?: number;

  constructor(message: string, options: SteamApiErrorOptions = {}) {
    super(message);
    this.name = "SteamApiError";
    this.status = options.status;
  }
}

export type SteamPlayerSummary = {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar?: string;
  avatarmedium?: string;
  avatarfull?: string;
  avatarhash?: string;
  communityvisibilitystate?: number;
  profilestate?: number;
  commentpermission?: number;
  personastate?: number;
  realname?: string;
  primaryclanid?: string;
  timecreated?: number;
  gameid?: string;
  gameextrainfo?: string;
  loccountrycode?: string;
  locstatecode?: string;
  loccityid?: number;
  lastlogoff?: number;
};

export type SteamPlayerBan = {
  SteamId: string;
  CommunityBanned: boolean;
  VACBanned: boolean;
  NumberOfVACBans: number;
  DaysSinceLastBan: number;
  NumberOfGameBans: number;
  EconomyBan: string;
};

export type SteamOwnedGame = GameDataSimple & {
  playtime_2weeks?: number;
};

export type SteamOwnedGamesSummary = {
  gameCount?: number;
  topGames: SteamOwnedGame[];
};

export type SteamUserProfile = {
  summary: SteamPlayerSummary;
  level?: number;
  bans?: SteamPlayerBan;
  friendCount?: number;
  ownedGames?: SteamOwnedGamesSummary;
  warnings: string[];
};

export type SteamUserSearchResult = {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar?: string;
  avatarmedium?: string;
  avatarfull?: string;
  realname?: string;
  personastate?: number;
  gameextrainfo?: string;
  communityvisibilitystate?: number;
  matchType: "steamid" | "vanity" | "community-search";
};

export type SteamUsersSearchResponse = {
  query: string;
  totalCount?: number;
  results: SteamUserSearchResult[];
  warnings: string[];
};

type CommunitySearchResult = {
  profileurl: string;
  personaname: string;
  avatar?: string;
  steamid?: string;
};

const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_COMMUNITY_BASE = "https://steamcommunity.com";
let communitySessionPromise: Promise<{ sessionId: string; cookie: string }> | undefined;

export function getSteamWebApiKey() {
  const { token } = getPreferenceValues<Preferences>();
  return (token || "").trim();
}

export function hasSteamWebApiKey() {
  return getSteamWebApiKey().length > 0;
}

export function cleanSteamUserQuery(input: string) {
  let query = input.trim();
  const replacements = [
    /^tell me about (?:the )?(?:steam )?(?:user|profile)\s+/i,
    /^tell me about\s+/i,
    /^who is (?:the )?(?:steam )?(?:user|profile)\s+/i,
    /^search (?:for )?(?:the )?(?:steam )?(?:user|profile)\s+/i,
    /^find (?:the )?(?:steam )?(?:user|profile)\s+/i,
    /^look up (?:the )?(?:steam )?(?:user|profile)\s+/i,
  ];

  for (const replacement of replacements) {
    query = query.replace(replacement, "");
  }

  return query.replace(/^["'`]+|["'`.,!?]+$/g, "").trim();
}

export function getPersonaStateText(state?: number) {
  switch (state) {
    case 0:
      return "Offline";
    case 1:
      return "Online";
    case 2:
      return "Busy";
    case 3:
      return "Away";
    case 4:
      return "Snooze";
    case 5:
      return "Looking to Trade";
    case 6:
      return "Looking to Play";
    default:
      return "Unknown";
  }
}

export function getProfileVisibilityText(state?: number) {
  switch (state) {
    case 1:
      return "Private";
    case 2:
      return "Friends Only";
    case 3:
      return "Public";
    default:
      return "Unknown";
  }
}

export function formatSteamTimestamp(timestamp?: number) {
  if (!timestamp) return undefined;
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

export function formatPlaytimeHours(minutes?: number) {
  if (!minutes) return undefined;
  const hours = minutes / 60;
  if (hours < 1) return `${minutes}m`;
  return `${Math.round(hours).toLocaleString()}h`;
}

export async function searchSteamUsers(
  input: string,
  options: { maxResults?: number } = {},
): Promise<SteamUsersSearchResponse> {
  const query = cleanSteamUserQuery(input);
  if (!query) return { query, results: [], warnings: [] };

  const key = getRequiredSteamWebApiKey();
  const maxResults = options.maxResults ?? 20;
  const warnings: string[] = [];
  const results: SteamUserSearchResult[] = [];

  const exactMatch = await resolveSteamUserIdentifier(query, key).catch((error: unknown) => {
    warnings.push(getErrorMessage(error));
    return undefined;
  });

  if (exactMatch) {
    const summary = await getPlayerSummary(exactMatch.steamid, key);
    if (summary) {
      results.push(summaryToSearchResult(summary, exactMatch.matchType));
    }
  }

  let totalCount: number | undefined;
  if (query.length >= 2) {
    try {
      const communityResults = await searchSteamCommunityUsers(query, maxResults);
      totalCount = communityResults.totalCount;
      const resolvedCommunityResults = await resolveCommunitySearchResults(communityResults.results, key);
      const steamids = resolvedCommunityResults
        .map((result) => result.steamid)
        .filter((steamid): steamid is string => Boolean(steamid));
      const summaries = await getPlayerSummaries(steamids, key);
      const summaryById = new Map(summaries.map((summary) => [summary.steamid, summary]));

      for (const communityResult of resolvedCommunityResults) {
        const steamid = communityResult.steamid;
        if (!steamid || results.some((result) => result.steamid === steamid)) continue;

        const summary = summaryById.get(steamid);
        if (summary) {
          results.push(summaryToSearchResult(summary, "community-search"));
        } else {
          results.push({
            steamid,
            personaname: communityResult.personaname,
            profileurl: communityResult.profileurl,
            avatar: communityResult.avatar,
            avatarmedium: communityResult.avatar,
            matchType: "community-search",
          });
        }
      }
    } catch (error) {
      warnings.push(`Community search failed: ${getErrorMessage(error)}`);
    }
  }

  return {
    query,
    totalCount,
    results: results.slice(0, maxResults),
    warnings,
  };
}

export async function getSteamUserProfile(
  steamid: string,
  options: { includeExtras?: boolean } = {},
): Promise<SteamUserProfile> {
  const key = getRequiredSteamWebApiKey();
  const summary = await getPlayerSummary(steamid, key);
  if (!summary) {
    throw new SteamApiError("Steam user not found");
  }

  if (!options.includeExtras) {
    return { summary, warnings: [] };
  }

  const [level, bans, friends, ownedGames] = await Promise.allSettled([
    getSteamLevel(steamid, key),
    getPlayerBan(steamid, key),
    getFriendCount(steamid, key),
    getOwnedGamesSummary(steamid, key),
  ]);

  const warnings = [level, bans, friends, ownedGames]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .filter((result) => !isExpectedPrivateProfileError(result.reason))
    .map((result) => getErrorMessage(result.reason));

  return {
    summary,
    level: level.status === "fulfilled" ? level.value : undefined,
    bans: bans.status === "fulfilled" ? bans.value : undefined,
    friendCount: friends.status === "fulfilled" ? friends.value : undefined,
    ownedGames: ownedGames.status === "fulfilled" ? ownedGames.value : undefined,
    warnings,
  };
}

function getRequiredSteamWebApiKey() {
  const key = getSteamWebApiKey();
  if (!key) {
    throw new SteamApiError("Set the Web API Key preference to search Steam users.");
  }
  return key;
}

async function resolveCommunitySearchResults(results: CommunitySearchResult[], key: string) {
  return Promise.all(
    results.map(async (result) => {
      if (result.steamid) return result;

      const vanity = getVanityFromProfileUrl(result.profileurl);
      if (!vanity) return result;

      const steamid = await resolveVanityUrl(vanity, key).catch(() => undefined);
      return { ...result, steamid };
    }),
  );
}

async function resolveSteamUserIdentifier(
  input: string,
  key: string,
): Promise<{ steamid: string; matchType: "steamid" | "vanity" } | undefined> {
  const directSteamId = getSteamIdFromInput(input);
  if (directSteamId) return { steamid: directSteamId, matchType: "steamid" };

  const vanity = getVanityFromInput(input);
  if (!vanity) return undefined;

  const steamid = await resolveVanityUrl(vanity, key);
  return steamid ? { steamid, matchType: "vanity" } : undefined;
}

async function resolveVanityUrl(vanity: string, key: string) {
  const response = await steamApiFetch<{
    response: {
      success: number;
      steamid?: string;
      message?: string;
    };
  }>("ISteamUser/ResolveVanityURL/v1/", key, { vanityurl: vanity });

  if (response.response.success !== 1) return undefined;
  return response.response.steamid;
}

async function getPlayerSummary(steamid: string, key: string) {
  const summaries = await getPlayerSummaries([steamid], key);
  return summaries[0];
}

async function getPlayerSummaries(steamids: string[], key: string) {
  if (!steamids.length) return [];

  const response = await steamApiFetch<{
    response: {
      players?: SteamPlayerSummary[];
    };
  }>("ISteamUser/GetPlayerSummaries/v2/", key, { steamids: steamids.join(",") });

  return response.response.players ?? [];
}

async function getPlayerBan(steamid: string, key: string) {
  const response = await steamApiFetch<{
    players?: SteamPlayerBan[];
  }>("ISteamUser/GetPlayerBans/v1/", key, { steamids: steamid });

  return response.players?.[0];
}

async function getSteamLevel(steamid: string, key: string) {
  const response = await steamApiFetch<{
    response?: {
      player_level?: number;
    };
  }>("IPlayerService/GetSteamLevel/v1/", key, { steamid });

  return response.response?.player_level;
}

async function getFriendCount(steamid: string, key: string) {
  const response = await steamApiFetch<{
    friendslist?: {
      friends?: {
        steamid: string;
        relationship: string;
        friend_since: number;
      }[];
    };
  }>("ISteamUser/GetFriendList/v1/", key, { steamid, relationship: "friend" });

  return response.friendslist?.friends?.length;
}

async function getOwnedGamesSummary(steamid: string, key: string): Promise<SteamOwnedGamesSummary> {
  const response = await steamApiFetch<{
    response?: {
      game_count?: number;
      games?: SteamOwnedGame[];
    };
  }>("IPlayerService/GetOwnedGames/v1/", key, {
    steamid,
    include_appinfo: 1,
    include_played_free_games: 1,
    format: "json",
  });

  const games = response.response?.games ?? [];
  const topGames = [...games]
    .filter((game) => game.playtime_forever > 0)
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 5);

  return {
    gameCount: response.response?.game_count,
    topGames,
  };
}

async function steamApiFetch<T>(path: string, key: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${STEAM_API_BASE}/${path}`);
  url.searchParams.set("key", key);

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }

  const response = await fetchJson<T>(url, { headers: { Accept: "application/json" } });
  return response;
}

async function searchSteamCommunityUsers(query: string, maxResults: number) {
  const session = await getCommunitySession();
  const url = new URL(`${STEAM_COMMUNITY_BASE}/search/SearchCommunityAjax`);
  url.searchParams.set("text", query);
  url.searchParams.set("filter", "users");
  url.searchParams.set("sessionid", session.sessionId);
  url.searchParams.set("steamid_user", "false");
  url.searchParams.set("page", "1");

  const response = await fetchJson<{
    success?: number;
    search_result_count?: number;
    html?: string;
  }>(url, {
    headers: {
      Accept: "application/json",
      Cookie: session.cookie,
      Referer: `${STEAM_COMMUNITY_BASE}/search/users/`,
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (response.success !== 1) {
    throw new SteamApiError("Steam Community search did not return results.");
  }

  return {
    totalCount: response.search_result_count,
    results: parseCommunitySearchHtml(response.html ?? "").slice(0, maxResults),
  };
}

async function getCommunitySession() {
  communitySessionPromise ??= fetchCommunitySession().catch((error: unknown) => {
    communitySessionPromise = undefined;
    throw error;
  });

  return communitySessionPromise;
}

async function fetchCommunitySession() {
  const response = await fetch(`${STEAM_COMMUNITY_BASE}/`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new SteamApiError(`Could not start Steam Community session (${response.status}).`, {
      status: response.status,
    });
  }

  const html = await response.text();
  const setCookie = response.headers.get("set-cookie") ?? "";
  const sessionId = /sessionid=([^;,]+)/.exec(setCookie)?.[1] ?? /g_sessionID\s*=\s*"([^"]+)"/.exec(html)?.[1];
  const cookie = setCookie
    .split(/,\s*(?=[^;,]+=)/)
    .map((value) => value.split(";")[0])
    .filter(Boolean)
    .join("; ");

  if (!sessionId || !cookie) {
    throw new SteamApiError("Could not read an anonymous Steam Community session.");
  }

  return { sessionId, cookie };
}

async function fetchJson<T>(url: URL, init?: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const text = await response.text();
    throw new SteamApiError(`${response.status} ${response.statusText}: ${trimErrorText(text)}`, {
      status: response.status,
    });
  }

  return (await response.json()) as T;
}

function parseCommunitySearchHtml(html: string) {
  const rows = html.match(/<div class="search_row"[\s\S]*?(?=<div class="search_row"|$)/g) ?? [];

  return rows
    .map((row): CommunitySearchResult | undefined => {
      const linkMatch = /<a class="searchPersonaName" href="([^"]+)">([\s\S]*?)<\/a>/.exec(row);
      if (!linkMatch) return undefined;

      const profileurl = decodeHtml(linkMatch[1]);
      const personaname = cleanHtmlText(linkMatch[2]);
      const avatar = /<img src="([^"]+)"/.exec(row)?.[1];
      const steamid = getSteamIdFromInput(profileurl);
      const result: CommunitySearchResult = {
        profileurl,
        personaname,
      };

      if (avatar) result.avatar = decodeHtml(avatar);
      if (steamid) result.steamid = steamid;

      return result;
    })
    .filter((result): result is CommunitySearchResult => Boolean(result?.profileurl && result.personaname));
}

function summaryToSearchResult(
  summary: SteamPlayerSummary,
  matchType: SteamUserSearchResult["matchType"],
): SteamUserSearchResult {
  return {
    steamid: summary.steamid,
    personaname: summary.personaname,
    profileurl: summary.profileurl,
    avatar: summary.avatar,
    avatarmedium: summary.avatarmedium,
    avatarfull: summary.avatarfull,
    realname: summary.realname,
    personastate: summary.personastate,
    gameextrainfo: summary.gameextrainfo,
    communityvisibilitystate: summary.communityvisibilitystate,
    matchType,
  };
}

function getSteamIdFromInput(input: string) {
  const direct = input.match(/^\d{17}$/)?.[0];
  if (direct) return direct;

  return input.match(/steamcommunity\.com\/profiles\/(\d{17})/i)?.[1] ?? input.match(/\/profiles\/(\d{17})/i)?.[1];
}

function getVanityFromInput(input: string) {
  const vanityFromUrl = getVanityFromProfileUrl(input);
  if (vanityFromUrl) return vanityFromUrl;

  if (/^[a-zA-Z0-9_-]{2,64}$/.test(input) && !/^\d+$/.test(input)) return input;
  return undefined;
}

function getVanityFromProfileUrl(input: string) {
  return input.match(/steamcommunity\.com\/id\/([^/?#]+)/i)?.[1] ?? input.match(/\/id\/([^/?#]+)/i)?.[1];
}

function cleanHtmlText(input: string) {
  return decodeHtml(input.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(input: string) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function trimErrorText(text: string) {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isExpectedPrivateProfileError(error: unknown) {
  if (error instanceof SteamApiError) {
    return error.status === 401 || error.status === 403;
  }

  if (!(error instanceof Error)) return false;

  return /\b(401|403)\b/.test(error.message) || /unauthorized|forbidden/i.test(error.message);
}
