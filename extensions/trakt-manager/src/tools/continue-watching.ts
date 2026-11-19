export type ContinueWatchingType = "all" | "shows" | "movies";

export type ContinueWatchingHalf<T> = { items: T[]; hasMore: boolean };

export const SHOWS_FAILED_WARNING =
  "Shows in progress could not be loaded from Trakt; only paused movies are listed. Do not conclude there are no shows in progress.";
export const MOVIES_FAILED_WARNING =
  "Paused movies could not be loaded from Trakt; only shows are listed. Do not conclude there are no paused movies.";

/**
 * Combines the shows and paused-movies requests of Continue Watching. With "all", one failed half
 * must not hide the other: the half that loaded comes back with a warning naming what is missing.
 * Throws when every requested half failed (the shows error first), and always for an explicit type.
 */
export function mergeContinueWatchingHalves<Show, Movie>(
  type: ContinueWatchingType,
  showsResult: PromiseSettledResult<ContinueWatchingHalf<Show>>,
  moviesResult: PromiseSettledResult<ContinueWatchingHalf<Movie>>,
): { shows: ContinueWatchingHalf<Show>; movies: ContinueWatchingHalf<Movie>; warning?: string } {
  if (showsResult.status === "rejected" && (type !== "all" || moviesResult.status === "rejected")) {
    throw showsResult.reason;
  }
  if (moviesResult.status === "rejected" && type !== "all") throw moviesResult.reason;

  const shows = showsResult.status === "fulfilled" ? showsResult.value : { items: [], hasMore: false };
  const movies = moviesResult.status === "fulfilled" ? moviesResult.value : { items: [], hasMore: false };
  const warning =
    showsResult.status === "rejected"
      ? SHOWS_FAILED_WARNING
      : moviesResult.status === "rejected"
        ? MOVIES_FAILED_WARNING
        : undefined;

  return warning ? { shows, movies, warning } : { shows, movies };
}
