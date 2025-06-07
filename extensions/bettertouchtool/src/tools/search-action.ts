import actions from "../actions.json";
import Fuse, { Expression } from "fuse.js";

type Input = {
  /**
   * Optional array of action names to search for. If provided, actions must match at least one
   * of these names (OR logic between names). Fuzzy matching is applied. Also searches
   * keywords.
   *
   * Example query: "find zoom actions" → searchNames: ["zoom"]
   * Example query: "find actions named either 'Copy' or 'Paste'" → searchNames: ["Copy", "Paste"]
   */
  searchNames?: string[];

  /**
   * Optional array of action IDs to search for. If provided, actions must match at least one
   * of these IDs (OR logic between IDs). Exact matching is applied.
   *
   * Example query: "find action with ID BTTPredefinedActionSleepDisplay" → searchIds: ["BTTPredefinedActionSleepDisplay"]
   */
  searchIds?: string[];
};

/**
 * Search for BTT Actions using fuzzy search with flexible filtering options.
 *
 * If any filter is not provided (undefined), that filter is not applied to the search.
 *
 * Example:
 * - "find zoom actions" maps to:
 *   searchNames: ["zoom"]
 *
 * - "find action with ID BTTPredefinedActionSleepDisplay" maps to:
 *   searchIds: ["BTTPredefinedActionSleepDisplay"]
 *
 * Returns search results with a score (0 = perfect match, 1 = complete mismatch)
 */
export default async function tool(input: Input) {
  const andExpressions: Expression[] = [];

  if (input.searchNames && input.searchNames.length > 0) {
    // Fuzzy search for action names and keywords
    andExpressions.push({
      $or: input.searchNames.flatMap((term): Expression[] => [
        {
          name: term,
        },
        {
          keywords: term,
        },
      ]),
    });
  }

  if (input.searchIds && input.searchIds.length > 0) {
    andExpressions.push({
      $or: input.searchIds.map((term) => ({
        id: term,
      })),
    });
  }

  const fuse = new Fuse(actions, {
    keys: [
      "name",
      {
        name: "keywords",
        weight: 0.333,
      },
      "id",
    ],
    includeScore: true,
    findAllMatches: true,
  });

  const searchResults = fuse.search({
    $and: andExpressions.length > 0 ? andExpressions : undefined,
  });

  return searchResults
    .filter((result) => !!result.score && result.score <= 0.6)
    .map((result) => ({
      score: result.score,
      name: result.item.name,
      id: result.item.id,
      type: result.item.type,
      keywords: result.item.keywords,
      param: result.item.param,
    }));
}
