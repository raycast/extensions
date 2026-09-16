import { CompactMovie, toCompactMovie } from "./compact-media";
import { describeYearFilter, searchMovieResults } from "./resolve-media";

type Input = {
  /**
   * The title of the movie to search for in the Trakt database.
   * Case-insensitive, supports partial titles.
   * Example: "inception", "the matrix"
   */
  title: string;
  /**
   * The release year of the movie to filter the results.
   * Optional integer, e.g. 2010.
   */
  year?: number;
};

type Output = {
  data: CompactMovie[];
  /**
   * How many movies Trakt returned for the title, before the `year` filter.
   * When `truncated` is false, a value above 0 with an empty `data` means the title exists
   * but not for that year. When it is true, an empty `data` proves nothing.
   */
  matchesForTitle: number;
  /**
   * True when Trakt returned as many releases as it can for the title, so others exist out
   * of reach. Never report an absence as a fact while this is true.
   */
  truncated: boolean;
  message?: string;
  hasMore: boolean;
};

/**
 * Search for movies in the Trakt database by title and optional year.
 * Returns a compact list of movies with their traktId, title, year, rating, and genres.
 * Always run this tool before any write action on a movie, to obtain its traktId.
 */
export default async function tool(input: Input): Promise<Output> {
  const { title, year } = input;

  const { items, truncated } = await searchMovieResults(title);
  const movies = year === undefined ? items : items.filter((item) => item.movie.year === year);

  return {
    data: movies.map(toCompactMovie),
    matchesForTitle: items.length,
    truncated,
    message: describeYearFilter(title, year, movies.length, items.length, truncated),
    hasMore: false,
  };
}
