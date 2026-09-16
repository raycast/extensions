import { withPagination } from "../lib/schema";
import { CompactShow, toCompactShow } from "./compact-media";
import { SEARCH_RESULT_CAP } from "./resolve-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * The title of the TV show to search for in the Trakt database.
   * Case-insensitive, supports partial titles.
   * Example: "breaking bad", "severance", "the office"
   */
  title: string;
  /**
   * The release year of the TV show to filter the results.
   * Optional integer, e.g. 2008.
   */
  year?: number;
  /**
   * The page number for paginated results. Defaults to 1.
   * Trakt caps search at 50 results on a single page, so this is rarely needed.
   */
  page?: number;
};

type Output = {
  data: CompactShow[];
  /**
   * How many shows Trakt returned for the title, before the `year` filter.
   * A value above 0 with an empty `data` means the title exists but not for that year.
   */
  matchesForTitle: number;
  hasMore: boolean;
};

/**
 * Search for TV shows in the Trakt database by title and optional year.
 * Returns a compact list of TV shows with their traktId, title, year, network, and genres.
 * Always run this tool before any write action on a TV show, to obtain its traktId.
 */
export default async function tool(input: Input): Promise<Output> {
  const { title, year, page = 1 } = input;

  const response = await executeToolCall(
    (signal) =>
      toolTraktClient.shows.searchShows({
        query: {
          query: title,
          page,
          limit: SEARCH_RESULT_CAP,
          fields: "title,aliases",
          extended: "full",
        },
        fetchOptions: { signal },
      }),
    `Failed to search TV shows for "${title}"`,
  );

  const paginated = withPagination(response);
  const shows = year === undefined ? paginated.data : paginated.data.filter((item) => item.show.year === year);

  return {
    data: shows.map(toCompactShow),
    matchesForTitle: paginated.data.length,
    hasMore: paginated.pagination["x-pagination-page"] < paginated.pagination["x-pagination-page-count"],
  };
}
