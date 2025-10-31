import { buildUrl } from "../utils/apiClient";
import type { TypeaheadResponse } from "../types";
import { MAX_API_LIMIT } from "../constants";

type Input = {
  /**
   * The search query to get typeahead suggestions for.
   */
  query: string;
  /**
   * Maximum number of suggestions to return. Defaults to 5.
   */
  limit?: number;
};

/**
 * Gets typeahead/autocomplete suggestions for a search query.
 * Useful for helping users find the right search terms quickly.
 */
const tool = async (input: Input) => {
  // Validate query input
  if (!input.query || typeof input.query !== "string" || input.query.trim() === "") {
    return {
      data: { results: [], searchTimeMs: 0 },
      success: true,
    };
  }

  // Validate limit if provided
  if (
    input.limit !== undefined &&
    (typeof input.limit !== "number" || input.limit < 1 || input.limit > MAX_API_LIMIT)
  ) {
    throw new Error(`Invalid limit: must be a number between 1 and ${MAX_API_LIMIT}`);
  }

  const url = buildUrl("/typeahead", {
    query: input.query.trim(),
    limit: input.limit || 5,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to fetch typeahead suggestions (${response.status}): ${response.statusText}. ${errorBody}`);
  }

  const data = (await response.json()) as TypeaheadResponse;

  return {
    data,
    success: true,
  };
};

export default tool;
