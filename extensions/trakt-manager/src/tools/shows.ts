import { initTraktClient } from "../lib/client";
import { withPagination } from "../lib/schema";

const traktClient = initTraktClient();

type Input = {
  /**
   * The title of the TV show to search for in the Trakt database.
   * This should be a non-empty string containing the full or partial show title.
   * The search is case-insensitive and will match partial titles.
   * Supports partial matching and will return similar results.
   * Example: "breaking" will match "Breaking Bad", "Breaking In", etc.
   */
  title: string;
  /**
   * The page number for paginated results.
   * Must be a positive integer starting from 1.
   * Each page returns exactly 10 TV show results.
   * Use this parameter for implementing infinite scroll or pagination UI.
   * Example: page 1 returns results 1-10, page 2 returns 11-20, etc.
   */
  page: number;
};

/**
 * Search for TV shows in the Trakt database.
 * Use this tool when:
 * - You need to find TV series by their title
 * - You need to search through the Trakt TV show database
 * - You want to get detailed show information including seasons and ratings
 *
 * The tool returns paginated results with 10 TV shows per page.
 * Each show result includes full metadata like year, number of seasons, status, and ratings.
 *
 * Input:
 * title: The TV show title to search for (e.g., "breaking bad", "office")
 * page: Page number starting from 1, returns 10 results per page
 *
 * Output:
 * data: List of TV shows with title, year, status, episodes, rating
 * hasMore: True if more pages are available
 */
const tool = async (input: Input) => {
  const { title, page } = input;
  const response = await traktClient.shows.searchShows({
    query: {
      query: title,
      page: page,
      limit: 10,
      fields: "title",
      extended: "full,cloud9",
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
