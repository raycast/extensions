import { buildUrl } from "../utils/apiClient";
import type { TypeaheadResponse } from "../types";

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
  if (!input.query || input.query.trim() === "") {
    return {
      data: { results: [], searchTimeMs: 0 },
      success: true,
    };
  }

  const url = buildUrl("/typeahead", {
    query: input.query,
    limit: input.limit || 5,
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch typeahead suggestions: ${response.statusText}`);
  }

  const data = (await response.json()) as TypeaheadResponse;

  return {
    data,
    success: true,
  };
};

export default tool;
