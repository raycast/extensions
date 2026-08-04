import {
  cleanSteamGameQuery,
  getSteamGameData,
  getSteamAppIdFromInput,
  resolveSteamGame,
  toSteamGameSummary,
} from "../lib/games";

type Input = {
  /**
   * Steam app ID. Use this when the user provides a Steam app ID or Steam store URL.
   */
  appid?: number;
  /**
   * Steam game title, Steam app ID, or Steam store URL. Examples: "Portal 2", "app 220", "https://store.steampowered.com/app/620/Portal_2/".
   */
  query?: string;
};

type Output = {
  query?: string;
  match?: {
    appid: number;
    name: string;
    storeUrl: string;
    matchType: "appid" | "search-result";
  };
  game?: ReturnType<typeof toSteamGameSummary>;
  warnings: string[];
};

/**
 * Get public Steam store details for one game by Steam app ID, Steam store URL, or title search.
 * Use this when the user asks what a game is, asks for details about a specific Steam game, or provides an app ID.
 */
export default async function getSteamGameDetailsTool(input: Input): Promise<Output> {
  const query = cleanSteamGameQuery(input.query ?? "");
  const appid = input.appid ?? (query ? getSteamAppIdFromInput(query) : undefined);

  if (!appid && !query) {
    return {
      warnings: ["No Steam app ID or game query was provided."],
    };
  }

  try {
    if (appid) {
      const gameData = await getSteamGameData(appid);
      const game = toSteamGameSummary(gameData);

      return {
        query: query || appid.toString(),
        match: {
          appid: game.appid,
          name: game.name,
          storeUrl: game.storeUrl,
          matchType: "appid",
        },
        game,
        warnings: [],
      };
    }

    const result = await resolveSteamGame(query);
    if (!result.game || !result.data) {
      return {
        query: result.query,
        warnings: ["No matching Steam game was found."],
      };
    }

    const game = toSteamGameSummary(result.data);
    return {
      query: result.query,
      match: {
        ...result.game,
        matchType: result.matchType,
      },
      game,
      warnings: [],
    };
  } catch (error) {
    return {
      query: query || appid?.toString(),
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}
