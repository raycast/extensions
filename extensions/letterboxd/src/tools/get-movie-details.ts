import { fetchMovieDetails } from "../letterboxd-api";
import {
  clampToolLimit,
  normalizeFilmPath,
  toMovieDetailsToolResult,
} from "../tool-results";

type Input = {
  /** Exact detailsPath or letterboxd.com film URL returned by search-movies. Never guess this value from a title. */
  filmPath: string;
  /** Maximum number of cast members to return, from 1 to 20. Defaults to 10. */
  castLimit?: number;
  /** Maximum number of popular review excerpts to return, from 0 to 10. Use 0 when reviews are not needed. Defaults to 5. */
  reviewLimit?: number;
};

/**
 * Get public details for one Letterboxd film. Call search-movies first unless an exact Letterboxd film path is already available.
 */
export default async function getMovieDetails(input: Input) {
  const filmPath = normalizeFilmPath(input.filmPath);
  const details = await fetchMovieDetails(filmPath);
  return toMovieDetailsToolResult(
    details,
    clampToolLimit(input.castLimit, 10, 20),
    clampToolLimit(input.reviewLimit, 5, 10, 0),
  );
}
