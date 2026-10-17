import { fetchMoviesByTitle } from "../letterboxd-api";
import { clampToolLimit, toSearchMoviesToolResult } from "../tool-results";

type Input = {
  /** Movie title or keywords to search for on Letterboxd. */
  query: string;
  /** Maximum number of results to return, from 1 to 10. Defaults to 5. */
  limit?: number;
};

/**
 * Search Letterboxd's public movie catalog. Use the returned detailsPath with get-movie-details when more information is needed.
 */
export default async function searchMovies(input: Input) {
  const query = input.query.trim();
  const limit = clampToolLimit(input.limit, 5, 10);
  if (!query) return toSearchMoviesToolResult(query, [], limit);

  const { data } = await fetchMoviesByTitle(query)({});
  return toSearchMoviesToolResult(query, data, limit);
}
