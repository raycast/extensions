import { CompactMovie, CompactShow, toCompactMovieFromBase, toCompactShowFromBase } from "./compact-media";
import { describeMedia } from "./resolve-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * "movies" for a movie's Trakt ID (from `search-movies`), "shows" for a show's (from `search-shows`).
   * Movie and show IDs overlap, so it must match the tool that produced the ID.
   */
  type: "movies" | "shows";
  /** Trakt ID of the movie or show to find similar titles for. */
  traktId: number;
  /** Number of similar titles to return (default: 10, max: 30). */
  limit?: number;
};

type Output = {
  /** The title the list is related to, as Trakt holds it. */
  relatedTo: string;
  movies?: CompactMovie[];
  shows?: CompactShow[];
};

/**
 * Get movies or shows Trakt considers similar to one title ("movies like Inception").
 * Resolve the title with `search-movies` or `search-shows` first and pass its `traktId` with the matching `type`.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type, traktId } = input;
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 30);
  const query = { page: 1, limit, extended: "full" as const };
  const relatedTo = await describeMedia(type === "movies" ? "movie" : "show", traktId);

  if (type === "movies") {
    const response = await executeToolCall(
      (signal) => toolTraktClient.movies.getRelatedMovies({ params: { id: traktId }, query, fetchOptions: { signal } }),
      "Failed to fetch similar movies",
    );
    return { relatedTo, movies: response.body.map(toCompactMovieFromBase) };
  }

  const response = await executeToolCall(
    (signal) => toolTraktClient.shows.getRelatedShows({ params: { id: traktId }, query, fetchOptions: { signal } }),
    "Failed to fetch similar shows",
  );
  return { relatedTo, shows: response.body.map(toCompactShowFromBase) };
}
