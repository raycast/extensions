import { CompactMovie, CompactShow, toCompactMovieFromBase, toCompactShowFromBase } from "./compact-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Filter recommendations by media type: "movies", "shows", or "all".
   * Defaults to "all".
   */
  type?: "movies" | "shows" | "all";
  /**
   * Number of recommendations to return per category (default: 10, max: 30).
   */
  limit?: number;
  /**
   * Ignore items already in your watchlist. Defaults to true.
   */
  ignoreWatchlisted?: boolean;
  /**
   * Ignore items already in your collection. Defaults to true.
   */
  ignoreCollected?: boolean;
};

type Output = {
  movies?: CompactMovie[];
  shows?: CompactShow[];
  totalRecommendations: number;
};

/**
 * Get personalized movie and TV show recommendations based on your Trakt viewing habits and ratings.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all", limit = 10, ignoreWatchlisted = true, ignoreCollected = true } = input;

  const safeLimit = Math.min(Math.max(limit, 1), 30);
  const commonQuery = {
    page: 1,
    limit: safeLimit,
    extended: "full" as const,
    ignore_watchlisted: ignoreWatchlisted,
    ignore_collected: ignoreCollected,
  };

  let movies: CompactMovie[] | undefined;
  let shows: CompactShow[] | undefined;

  if (type === "movies") {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.movies.getRecommendedMovies({
          query: commonQuery,
          fetchOptions: { signal },
        }),
      "Failed to fetch movie recommendations",
    );
    movies = res.body.map(toCompactMovieFromBase);
  } else if (type === "shows") {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.shows.getRecommendedShows({
          query: commonQuery,
          fetchOptions: { signal },
        }),
      "Failed to fetch show recommendations",
    );
    shows = res.body.map(toCompactShowFromBase);
  } else {
    const [moviesRes, showsRes] = await Promise.all([
      executeToolCall(
        (signal) =>
          toolTraktClient.movies.getRecommendedMovies({
            query: commonQuery,
            fetchOptions: { signal },
          }),
        "Failed to fetch movie recommendations",
      ),
      executeToolCall(
        (signal) =>
          toolTraktClient.shows.getRecommendedShows({
            query: commonQuery,
            fetchOptions: { signal },
          }),
        "Failed to fetch show recommendations",
      ),
    ]);

    movies = moviesRes.body.map(toCompactMovieFromBase);
    shows = showsRes.body.map(toCompactShowFromBase);
  }

  const totalRecommendations = (movies?.length ?? 0) + (shows?.length ?? 0);

  return {
    movies,
    shows,
    totalRecommendations,
  };
}
