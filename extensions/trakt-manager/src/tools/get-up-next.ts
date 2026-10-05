import { scanPageComplete, withPagination } from "../lib/schema";
import { CompactUpNextItem, toCompactUpNext } from "./compact-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The page number for paginated results. Defaults to 1.
   */
  page?: number;
  /**
   * Number of up-next items to retrieve (default: 20, max: 50).
   */
  limit?: number;
};

type Output = {
  data: CompactUpNextItem[];
  page: number;
  hasMore: boolean;
  /**
   * Always false: this is a browse page, not a lookup. Absence from it does not mean
   * a show has no next episode.
   */
  exhaustive: false;
};

/**
 * Get the next unwatched episodes for TV shows you are currently watching on Trakt.
 * For each show, returns the next episode number, season, title, first aired date, and overall progress.
 */
export default async function tool(input: Input): Promise<Output> {
  const { page = 1, limit = 20 } = input;
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.shows.getUpNextNitroShows({
        query: {
          page,
          limit: safeLimit,
          intent: "continue",
        },
        fetchOptions: { signal },
      }),
    "Failed to fetch up-next shows",
  );

  const paginated = withPagination(response);

  // up_next_nitro sends a fixed page count (trakt/trakt-api#926), so a full page does not prove
  // there is a next one: when this page is full, look at the next page before promising more.
  let hasMore = !scanPageComplete(paginated.data.length, paginated.pagination, safeLimit);
  if (hasMore) {
    // Only a hint: a failed lookahead must not discard the page already fetched, so keep "maybe more".
    try {
      const next = await executeToolCall(
        (signal) =>
          toolTraktClient.shows.getUpNextNitroShows({
            query: { page: page + 1, limit: safeLimit, intent: "continue" },
            fetchOptions: { signal },
          }),
        "Failed to fetch up-next shows",
      );
      hasMore = Array.isArray(next.body) && next.body.length > 0;
    } catch {
      hasMore = true;
    }
  }

  return {
    data: paginated.data.map(toCompactUpNext),
    page,
    hasMore,
    exhaustive: false,
  };
}
