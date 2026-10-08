import { QueryHistoryEntry } from "../lib/types";
import { searchHistory } from "../lib/mcp";

type Input = {
  /** Free-text search across query bodies and connection names. */
  query: string;
  /** Maximum results to return. Defaults to 50. */
  limit?: number;
  /** Earliest executed_at to include, Unix epoch seconds (inclusive). */
  since?: number;
  /** Latest executed_at to include, Unix epoch seconds (inclusive). */
  until?: number;
};

export default async function tool(input: Input): Promise<QueryHistoryEntry[]> {
  return searchHistory(input.query, input.limit ?? 50, {
    since: input.since,
    until: input.until,
  });
}
