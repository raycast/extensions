import { getNamedTriggers } from "../api";
import Fuse, { Expression } from "fuse.js";
import { Result } from "../types";

type Input = {
  /**
   * Optional array of group names to search within. If provided, triggers must belong to at least one
   * of these groups (OR logic between groups). For example, ["Helpers", "Utilities"] will match triggers
   * in either the "Helpers" OR "Utilities" groups.
   *
   * Groups might be referred to as "folders", "groups", or "categories".
   *
   * Example query: "find all triggers in the group Helpers" → searchGroups: ["Helpers"]
   * Example query: "find triggers in Helpers or Utilities folders" → searchGroups: ["Helpers", "Utilities"]
   */
  searchGroups?: string[];

  /**
   * Optional array of trigger names to search for. If provided, triggers must match at least one
   * of these names (OR logic between names). Fuzzy matching is applied.
   *
   * Example query: "find keyboard triggers" → searchNames: ["keyboard"]
   * Example query: "find triggers named either 'Copy' or 'Paste'" → searchNames: ["Copy", "Paste"]
   */
  searchNames?: string[];

  /**
   * Optional filter by enabled/disabled status.
   * - "enabled": Only return enabled triggers
   * - "disabled": Only return disabled triggers
   * - undefined: Return both enabled and disabled triggers
   *
   * Example query: "find all disabled triggers" → searchEnabledStatus: "disabled"
   * Example query: "find enabled triggers" → searchEnabledStatus: "enabled"
   * Example query: "find triggers in group Helpers" → searchEnabledStatus: undefined
   */
  searchEnabledStatus?: "enabled" | "disabled";
};

export type SearchResult = {
  score: string;
  name: string;
  enabled: boolean;
  groupName?: string;
};

/**
 * Search for Named Triggers using fuzzy search with flexible filtering options.
 *
 * The search uses AND logic between different filter types (groups, names, enabled status),
 * and OR logic within each filter type. This means a result must match:
 * - At least one of the specified groups (if searchGroups is provided) AND
 * - At least one of the specified names (if searchNames is provided) AND
 * - The specified enabled status (if searchEnabledStatus is provided)
 *
 * If any filter is not provided (undefined), that filter is not applied to the search.
 *
 * Example:
 * - "find all disabled triggers in the group Helpers" maps to:
 *   searchGroups: ["Helpers"], searchEnabledStatus: "disabled"
 *
 * - "find keyboard triggers in either Utilities or Macros groups" maps to:
 *   searchGroups: ["Utilities", "Macros"], searchNames: ["keyboard"]
 *
 * Returns search results with a score (0 = perfect match, 1 = complete mismatch).
 *
 * IMPORTANT: Only tell the user about triggers that match their search criteria. NEVER
 * mention triggers that do not fit their criteria.
 */
export default async function tool(input: Input): Promise<Result<SearchResult[]>> {
  const namedTriggersResult = await getNamedTriggers();
  if (namedTriggersResult.status === "error") {
    return {
      status: "error",
      error: namedTriggersResult.error,
    };
  }

  const andExpressions: Expression[] = [];
  if (input.searchGroups && input.searchGroups.length > 0) {
    andExpressions.push({
      $or: input.searchGroups.map((term) => ({
        groupName: term,
      })),
    });
  }
  if (input.searchNames && input.searchNames.length > 0) {
    andExpressions.push({
      $or: input.searchNames.map((term) => ({
        name: term,
      })),
    });
  }

  let searchTriggers = namedTriggersResult.data;
  if (input.searchEnabledStatus) {
    const isEnabled = input.searchEnabledStatus === "enabled";
    searchTriggers = searchTriggers.filter((trigger) => trigger.enabled === isEnabled);
  }
  const fuse = new Fuse(searchTriggers, {
    keys: ["name", "groupName"],
    includeScore: true,
    findAllMatches: true,
  });
  const searchResults = fuse.search({
    $and: andExpressions,
  });

  const data: SearchResult[] = searchResults.map((result) => ({
    name: result.item.name,
    enabled: result.item.enabled,
    groupName: result.item.groupName,
    score: result.score?.toFixed(6) ?? "Unknown",
  }));
  return {
    status: "success",
    data,
  };
}
