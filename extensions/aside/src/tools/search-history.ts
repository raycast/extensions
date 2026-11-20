import { searchHistory } from "../lib/history";
import { clampLimit } from "../lib/tool-input";

type Input = {
  /** Optional multiword search over page titles and URLs. Omit it for recently visited pages. */
  query?: string;
  /** Maximum history entries to return. Defaults to 20 and is clamped from 1 through 50. */
  limit?: number;
};

/** Search the configured Aside profile's local browsing history. */
export default async function tool(input: Input) {
  const limit = clampLimit(input.limit, 20, 50);
  const result = await searchHistory(input.query, limit);
  return {
    totalMatches: result.totalMatches,
    returned: result.entries.length,
    truncated: result.entries.length < result.totalMatches,
    entries: result.entries,
  };
}
