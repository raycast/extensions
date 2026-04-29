import { getObjectsByIds, search, MyMindObject } from "../api";
import { safeHostname } from "../utils";

type Input = {
  /**
   * The search query. Supports the mymind search syntax: plain words, quoted
   * phrases, &&/||/-, and field filters tag:, type:, title:, author:,
   * domain:, action:, completed:.
   */
  query: string;
  /**
   * Maximum number of results to return. Defaults to 20, capped at 50.
   */
  limit?: number;
};

interface ResultRow {
  id: string;
  title: string;
  url?: string;
  domain?: string;
  tags: string[];
  modified: string;
  score: number;
}

function summarize(obj: MyMindObject, score: number): ResultRow {
  return {
    id: obj.id,
    title: obj.title || "Untitled",
    url: obj.source?.url,
    domain: safeHostname(obj.source?.url),
    tags: obj.tags.map((t) => t.name),
    modified: obj.modified,
    score,
  };
}

/**
 * Searches the user's mymind library and returns the top matches with their
 * id, title, source URL (if any), tags, and last-modified timestamp.
 */
export default async function (input: Input): Promise<ResultRow[]> {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 50));
  const matches = await search({ q: input.query, limit, semantic: true, rerank: true });
  if (matches.length === 0) return [];
  const fetched = await getObjectsByIds(matches.map((m) => m.id));
  const byId = new Map(fetched.map((o) => [o.id, o]));
  return matches
    .map((m) => {
      const obj = byId.get(m.id);
      return obj ? summarize(obj, m.score) : null;
    })
    .filter((row): row is ResultRow => row !== null);
}
