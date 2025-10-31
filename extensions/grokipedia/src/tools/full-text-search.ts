import { createFailure, createSuccess, type ToolResult } from "./tool-result";
import { buildUrl } from "../utils/apiClient";
import type { FullTextSearchResponse } from "../types";
import { FULL_TEXT_SEARCH_LIMIT, MAX_API_LIMIT } from "../constants";

type Input = {
  /**
   * The search query to execute.
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to FULL_TEXT_SEARCH_LIMIT.
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
const EMPTY_RESPONSE: FullTextSearchResponse = {
  results: [],
  facets: [],
  totalCount: 0,
  searchTimeMs: 0,
};

const tool = async (input: Input): Promise<ToolResult<FullTextSearchResponse>> => {
  const query = typeof input.query === "string" ? input.query.trim() : "";

  if (!query) {
    return createSuccess(EMPTY_RESPONSE);
  }

  const limit = input.limit ?? FULL_TEXT_SEARCH_LIMIT;
  if (typeof limit !== "number" || Number.isNaN(limit) || limit < 1 || limit > MAX_API_LIMIT) {
    return createFailure(`Invalid limit: must be a number between 1 and ${MAX_API_LIMIT}`);
  }

  const offset = input.offset ?? 0;
  if (typeof offset !== "number" || Number.isNaN(offset) || offset < 0) {
    return createFailure("Invalid offset: must be a non-negative number");
  }

  const url = buildUrl("/full-text-search", {
    query,
    limit,
    offset,
  });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      return createFailure(
        `Failed to perform full-text search (${response.status}): ${response.statusText}. ${errorBody}`,
      );
    }

    const data = (await response.json()) as FullTextSearchResponse;
    return createSuccess(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createFailure(`Failed to perform full-text search: ${message}`);
  }
};

export default tool;
