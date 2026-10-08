import {
  cleanSteamGameQuery,
  getSteamGameData,
  localListWarning,
  searchSteamGames,
  SteamGameSearchResult,
  toSteamGameSummary,
} from "../lib/games";

type Input = {
  /**
   * Words from a game's title. Examples: "Portal 2", "Balatro", "Stardew Valley". Never genres, descriptions, or "like X" phrases, which match no titles.
   */
  query: string;
  /**
   * Maximum number of games to return.
   */
  maxResults?: number;
  /**
   * Include public Steam store details for the first matching games when the user needs more than names and app IDs.
   */
  includeDetails?: boolean;
};

type ToolGameSearchResult = SteamGameSearchResult & {
  details?: ReturnType<typeof toSteamGameSummary>;
  warning?: string;
};

type Output = {
  query: string;
  results: ToolGameSearchResult[];
  warnings: string[];
};

/**
 * Search Steam games by title and return matching apps.
 * Use this to look up a game the user names, or to identify a Steam app from a title. It only matches titles, so for games like another game use Find Similar Games or Recommend Games instead.
 */
export default async function searchSteamGamesTool(input: Input): Promise<Output> {
  const query = cleanSteamGameQuery(input.query);
  const maxResults = Math.min(Math.max(input.maxResults ?? 5, 1), 10);

  if (!query) {
    return {
      query,
      results: [],
      warnings: ["No Steam game query was provided."],
    };
  }

  try {
    const results = await searchSteamGames(query, { maxResults });
    const warnings = [localListWarning()].filter((warning): warning is string => Boolean(warning));
    const includeDetails = Boolean(input.includeDetails);

    if (!includeDetails) {
      return {
        query,
        results,
        warnings,
      };
    }

    const detailedResults = await Promise.all(
      results.slice(0, maxResults).map(async (result): Promise<ToolGameSearchResult> => {
        try {
          const details = await getSteamGameData(result.appid);
          return {
            ...result,
            details: toSteamGameSummary(details),
          };
        } catch (error) {
          return {
            ...result,
            warning: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    return {
      query,
      results: detailedResults,
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
