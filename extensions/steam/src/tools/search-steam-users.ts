import {
  cleanSteamUserQuery,
  formatPlaytimeHours,
  formatSteamTimestamp,
  getPersonaStateText,
  getProfileVisibilityText,
  getSteamUserProfile,
  searchSteamUsers,
  SteamUserProfile,
  SteamUserSearchResult,
} from "../lib/users";

type Input = {
  /**
   * Steam user search text. Use a Steam ID, profile URL, vanity URL, or display name. Examples: "gabelogannewell", "76561197960287930", "https://steamcommunity.com/id/gabelogannewell".
   */
  query: string;
  /**
   * Maximum number of users to return. Use 1 when the user provided a Steam ID, profile URL, or vanity URL. Use more for display-name searches.
   */
  maxResults?: number;
};

type ToolUserResult = {
  steamId: string;
  personaName: string;
  profileUrl: string;
  realName?: string;
  status: string;
  currentlyPlaying?: string;
  visibility: string;
  countryCode?: string;
  accountCreated?: string;
  lastOnline?: string;
  steamLevel?: number;
  friendCount?: number;
  gameCount?: number;
  topPlayedGames: {
    name: string;
    playtime: string;
  }[];
  bans?: {
    communityBanned: boolean;
    vacBanned: boolean;
    vacBanCount: number;
    gameBanCount: number;
    daysSinceLastBan: number;
    economyBan: string;
  };
  matchType: SteamUserSearchResult["matchType"];
  warnings: string[];
};

type Output = {
  query: string;
  totalCommunityMatches?: number;
  results: ToolUserResult[];
  warnings: string[];
};

/**
 * Search Steam users by Steam ID, profile URL, vanity URL, or display name and return public profile information.
 * Use this when the user asks about a Steam user, asks to find a Steam profile, or asks to summarize who a Steam user is.
 */
export default async function searchSteamUsersTool(input: Input): Promise<Output> {
  const query = cleanSteamUserQuery(input.query);
  const maxResults = Math.min(Math.max(input.maxResults ?? 3, 1), 5);

  if (!query) {
    return {
      query,
      results: [],
      warnings: ["No Steam user query was provided."],
    };
  }

  try {
    const search = await searchSteamUsers(query, { maxResults });
    const profileResults = await Promise.allSettled(
      search.results.slice(0, maxResults).map(async (result) => {
        const profile = await getSteamUserProfile(result.steamid, { includeExtras: true });
        return toToolResult(profile, result.matchType);
      }),
    );
    const results = profileResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    const warnings = [
      ...search.warnings,
      ...profileResults.flatMap((result, index) => {
        if (result.status === "fulfilled") return [];

        const user = search.results[index];
        return [
          `Could not load profile details for ${user?.personaname ?? user?.steamid ?? "a result"}: ${getToolErrorMessage(result.reason)}`,
        ];
      }),
    ];

    return {
      query: search.query,
      totalCommunityMatches: search.totalCount,
      results,
      warnings,
    };
  } catch (error) {
    return {
      query,
      results: [],
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function getToolErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toToolResult(profile: SteamUserProfile, matchType: SteamUserSearchResult["matchType"]): ToolUserResult {
  const { summary } = profile;

  return {
    steamId: summary.steamid,
    personaName: summary.personaname,
    profileUrl: summary.profileurl,
    realName: summary.realname,
    status: getPersonaStateText(summary.personastate),
    currentlyPlaying: summary.gameextrainfo,
    visibility: getProfileVisibilityText(summary.communityvisibilitystate),
    countryCode: summary.loccountrycode,
    accountCreated: formatSteamTimestamp(summary.timecreated),
    lastOnline: formatSteamTimestamp(summary.lastlogoff),
    steamLevel: profile.level,
    friendCount: profile.friendCount,
    gameCount: profile.ownedGames?.gameCount,
    topPlayedGames:
      profile.ownedGames?.topGames.map((game) => ({
        name: game.name,
        playtime: formatPlaytimeHours(game.playtime_forever) ?? "0m",
      })) ?? [],
    bans: profile.bans
      ? {
          communityBanned: profile.bans.CommunityBanned,
          vacBanned: profile.bans.VACBanned,
          vacBanCount: profile.bans.NumberOfVACBans,
          gameBanCount: profile.bans.NumberOfGameBans,
          daysSinceLastBan: profile.bans.DaysSinceLastBan,
          economyBan: profile.bans.EconomyBan,
        }
      : undefined,
    matchType,
    warnings: profile.warnings,
  };
}
