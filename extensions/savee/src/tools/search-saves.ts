import { listFeed, listSaves } from "../api";
import { getErrorMessage } from "../errors";
import { formatSaveForAI, matchesQuery } from "../save-utils";
import { Save } from "../types";

const MAX_PAGES = 5;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type Input = {
  /**
   * Words to look for in each save's title, source link, author, colors (hex, like #1A2B3C) and AI visual description.
   * Every word has to match. Leave empty for the most recent saves.
   */
  query?: string;
  /** "saves" for the user's own saves (default), or "feed" for their home feed */
  scope?: "saves" | "feed";
  /** How many results to return, 1 to 50. Defaults to 20 */
  limit?: number;
};

/**
 * Finds the user's own Savee saves, or their home feed, newest first.
 * Savee has no server-side search for a user's own saves, so this scans their most recent 500.
 */
export default async function tool(input: Input) {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const results: Save[] = [];
  let cursor: string | undefined;
  let scanned = 0;
  let hasMore = true;

  try {
    for (let page = 0; page < MAX_PAGES && hasMore && results.length < limit; page += 1) {
      const response = input.scope === "feed" ? await listFeed(cursor) : await listSaves(cursor);
      scanned += response.data.length;
      results.push(...response.data.filter((save) => matchesQuery(save, input.query)));
      cursor = response.next_cursor ?? undefined;
      hasMore = response.has_more && Boolean(cursor);
    }
  } catch (error) {
    return { error: getErrorMessage(error) };
  }

  return {
    results: results.slice(0, limit).map(formatSaveForAI),
    scanned,
    reachedEndOfLibrary: !hasMore,
  };
}
