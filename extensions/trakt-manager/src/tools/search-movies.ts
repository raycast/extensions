import { CompactMovie, toCompactMovie } from "./compact-media";
import { describeYearFilter, searchMovieResults } from "./resolve-media";
import { normalizeTitle, resolveLookupQuery } from "./title-text";

type Input = {
  /**
   * The title of the movie to search for in the Trakt database.
   * Case-insensitive, supports partial titles.
   * A trailing year ("Dune 1989", "Dune (1989)") is parsed the same as `year`.
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
 * Use this to obtain a movie \`traktId\` before a targeted lookup.
 */
export default async function tool(input: Input): Promise<Output> {
  const { title, year } = input;
  const lookup = resolveLookupQuery(title, year);
  const searchTitle = lookup.text ?? title;

  const { items, truncated } = await searchMovieResults(searchTitle);
  const rawExact = items.filter((item) => normalizeTitle(item.movie.title) === normalizeTitle(title));
  // An exact-title hit only decides whether a year stuffed into `title` is a filter.
  // It must not hide related results ("Dune" still has to return "Dune: Part Two").
  const appliedYear = rawExact.length > 0 ? year : lookup.year;
  const movies = appliedYear === undefined ? items : items.filter((item) => item.movie.year === appliedYear);

  return {
    data: movies.map(toCompactMovie),
    matchesForTitle: items.length,
    truncated,
    message: describeYearFilter(
      rawExact.length > 0 ? title : searchTitle,
      appliedYear,
      movies.length,
      items.length,
      truncated,
    ),
    hasMore: false,
  };
}
