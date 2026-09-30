import { withPagination } from "../lib/schema";
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
  totalItems?: number;
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
      toolTraktClient.shows.getUpNextShows({
        query: {
          page,
          limit: safeLimit,
          extended: "full",
          sort_by: "added",
          sort_how: "desc",
          include_stats: true,
        },
        fetchOptions: { signal },
      }),
    "Failed to fetch up-next shows",
  );

  const paginated = withPagination(response);

  return {
    data: paginated.data.map(toCompactUpNext),
    page,
    totalItems: paginated.pagination["x-pagination-item-count"],
    hasMore: paginated.pagination["x-pagination-page"] < paginated.pagination["x-pagination-page-count"],
    exhaustive: false,
  };
}
