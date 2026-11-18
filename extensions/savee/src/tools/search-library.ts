import { searchLibrary } from "../api";
import { getErrorMessage } from "../errors";
import { getRemaining, WEEKLY_SEARCH_POLICY } from "../rate-limit";
import { formatSaveForAI } from "../save-utils";

type Input = {
  /** What to look for, at least 2 characters. Be specific: each call uses one of the user's 200 weekly searches */
  query: string;
  /** How many results, 1 to 30. Defaults to 30 */
  limit?: number;
};

/**
 * Searches Savee's public library: everyone's work, not the user's own saves.
 * Use it only for references the user hasn't saved. Limited to 20 searches per 5 minutes and 200 per week.
 */
export default async function tool(input: Input) {
  const query = input.query.trim();
  if (query.length < 2) {
    return { error: "The search needs at least 2 characters." };
  }

  try {
    const { data, rateLimits } = await searchLibrary(query, undefined, input.limit);
    return {
      results: data.data.map(formatSaveForAI),
      searchesLeftThisWeek: getRemaining(rateLimits, WEEKLY_SEARCH_POLICY),
    };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
