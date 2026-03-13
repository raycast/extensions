import { initTraktClient } from "../lib/client";
import { withPagination } from "../lib/schema";

const traktClient = initTraktClient();

type Input = {
  /**
   * The page number for paginated results.
   * Must be a positive integer starting from 1.
   * Each page returns exactly 10 up-next episodes.
   * Use this parameter for implementing infinite scroll or pagination UI.
   * Example: page 1 returns results 1-10, page 2 returns 11-20, etc.
   */
  page: number;
};

/**
 * Get the next unwatched episodes for TV shows you've started watching.
 * Use this tool when:
 * - You want to see what episodes are next in your watchlist
 * - You need to find the next episode for shows you're currently watching
 * - You want to track your progress across multiple TV series
 *
 * For each show you've started but not finished, this will return the next
 * episode you need to watch. For example, if you've watched S01E01-E02 of
 * Breaking Bad, this will show S01E03 as the next episode to watch.
 *
 * The tool returns paginated results with 10 up-next episodes per page.
 * Each result includes the show's metadata and the specific next episode details.
 *
 * Input:
 * page: Page number starting from 1, returns 10 results per page
 *
 * Output:
 * data: List of up-next episodes with show and episode details
 * hasMore: True if more pages are available
 */
const tool = async (input: Input) => {
  const { page } = input;
  const response = await traktClient.shows.getUpNextShows({
    query: {
      page: page,
      limit: 10,
      extended: "full,cloud9",
      sort_by: "added",
      sort_how: "asc",
      include_stats: true,
    },
    fetchOptions: {
      signal: AbortSignal.timeout(3600),
    },
  });

  if (response.status !== 200) return { data: [], hasMore: false };
  const paginatedResponse = withPagination(response);

  return {
    data: paginatedResponse.data,
    hasMore:
      paginatedResponse.pagination["x-pagination-page"] < paginatedResponse.pagination["x-pagination-page-count"],
  };
};

export default tool;
