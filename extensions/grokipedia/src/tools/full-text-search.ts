import { buildUrl } from "../utils/apiClient";
import type { FullTextSearchResponse } from "../types";
import { MAX_API_LIMIT } from "../constants";

type Input = {
  /**
   * The search query to execute.
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 12.
   */
  limit?: number;
  /**
   * Number of results to skip (for pagination). Defaults to 0.
   */
  offset?: number;
};

/**
 * Performs a full-text search across Grokipedia articles.
 * Returns detailed search results with snippets, highlights, and relevance scores.
 */
const tool = async (input: Input) => {
  // Validate query input
  if (!input.query || typeof input.query !== "string" || input.query.trim() === "") {
    throw new Error("Invalid query: query must be a non-empty string");
  }

  // Validate limit if provided
  if (
    input.limit !== undefined &&
    (typeof input.limit !== "number" || input.limit < 1 || input.limit > MAX_API_LIMIT)
  ) {
    throw new Error(`Invalid limit: must be a number between 1 and ${MAX_API_LIMIT}`);
  }

  // Validate offset if provided
  if (input.offset !== undefined && (typeof input.offset !== "number" || input.offset < 0)) {
    throw new Error("Invalid offset: must be a non-negative number");
  }

  const url = buildUrl("/full-text-search", {
    query: input.query.trim(),
    limit: input.limit || 12,
    offset: input.offset || 0,
  });

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to perform full-text search (${response.status}): ${response.statusText}. ${errorBody}`);
  }

  const data = (await response.json()) as FullTextSearchResponse;

  return {
    data,
    success: true,
  };
};

export default tool;
