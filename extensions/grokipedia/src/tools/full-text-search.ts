import { buildUrl } from "../utils/apiClient";
import type { FullTextSearchResponse } from "../types";

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
  const url = buildUrl("/full-text-search", {
    query: input.query,
    limit: input.limit || 12,
    offset: input.offset || 0,
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to perform full-text search: ${response.statusText}`);
  }

  const data = (await response.json()) as FullTextSearchResponse;

  return {
    data,
    success: true,
  };
};

export default tool;
