import { readHistory } from "../lib/data";
import { matchesQuery } from "../lib/utils";

type Input = {
  /** Search terms to filter browsing history by title or URL. */
  query?: string;
  /** Maximum number of history entries to return (default: 25). */
  limit?: number;
};

export default async function tool(input: Input = {}) {
  const query = input.query?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
  const entries = readHistory()
    .filter((entry) => matchesQuery(query, entry.title, entry.url))
    .slice(0, limit);

  return {
    count: entries.length,
    entries: entries.map((entry) => ({
      title: entry.title,
      url: entry.url,
      visitCount: entry.visitCount,
      lastVisited: entry.lastVisited.toISOString(),
    })),
  };
}
