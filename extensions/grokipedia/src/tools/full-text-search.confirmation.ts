import { Tool } from "@raycast/api";

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
 * Optional confirmation for full-text search.
 * This is just a demonstration - you could skip confirmation for read-only operations.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const limit = input.limit || 12;
  const offset = input.offset || 0;

  return {
    message: `Search Grokipedia for "${input.query}"?`,
    info: [
      { name: "Query", value: input.query },
      { name: "Max Results", value: String(limit) },
      { name: "Offset", value: String(offset) },
    ],
  };
};
