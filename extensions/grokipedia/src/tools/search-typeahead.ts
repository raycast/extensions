import { createFailure, createSuccess, type ToolResult } from "./tool-result";
import { buildUrl } from "../utils/apiClient";
import type { TypeaheadResponse } from "../types";
import { MAX_API_LIMIT, TYPEAHEAD_LIMIT } from "../constants";

type Input = {
  /**
   * The search query to get typeahead suggestions for.
   */
  query: string;
  /**
   * Maximum number of suggestions to return. Defaults to TYPEAHEAD_LIMIT.
   */
  limit?: number;
};

/**
 * Gets typeahead/autocomplete suggestions for a search query.
 * Useful for helping users find the right search terms quickly.
 */
const EMPTY_RESPONSE: TypeaheadResponse = {
  results: [],
  searchTimeMs: 0,
};

const tool = async (input: Input): Promise<ToolResult<TypeaheadResponse>> => {
  const query = typeof input.query === "string" ? input.query.trim() : "";

  if (!query) {
    return createSuccess(EMPTY_RESPONSE);
  }

  const limit = input.limit ?? TYPEAHEAD_LIMIT;
  if (typeof limit !== "number" || Number.isNaN(limit) || limit < 1 || limit > MAX_API_LIMIT) {
    return createFailure(`Invalid limit: must be a number between 1 and ${MAX_API_LIMIT}`);
  }

  const url = buildUrl("/typeahead", {
    query,
    limit,
  });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      return createFailure(
        `Failed to fetch typeahead suggestions (${response.status}): ${response.statusText}. ${errorBody}`,
      );
    }

    const data = (await response.json()) as TypeaheadResponse;
    return createSuccess(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return createFailure(`Failed to fetch typeahead suggestions: ${message}`);
  }
};

export default tool;
