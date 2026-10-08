import { useCachedState, usePromise } from "@raycast/utils";
import { initTraktClient } from "./client";
import { isWatched, toWatchedIndex, WatchedIndex, WatchedTarget, withWatched } from "./media-state";

const CACHE_KEY = "trakt-watched-index";

/**
 * Reads what the user has watched, shared like the watchlist ids. `isWatched` is `undefined` while the
 * history is unknown, so "Remove from History" stays offered rather than hidden by mistake.
 */
export function useWatchedState() {
  const [index, setIndex] = useCachedState<WatchedIndex | undefined>(CACHE_KEY);

  return {
    isWatched: (target: WatchedTarget) => (index ? isWatched(index, target) : undefined),
    setWatched: (target: WatchedTarget, watched: boolean) =>
      setIndex((current) => (current ? withWatched(current, target, watched) : current)),
    setIndex,
  };
}

/** Fetches what the user has watched when a view opens and keeps the shared state in step. */
export function useWatchedSync() {
  const traktClient = initTraktClient();
  const { setIndex } = useWatchedState();

  usePromise(
    async () => {
      const [movies, shows] = await Promise.all([
        traktClient.sync.getWatchedMovies(),
        traktClient.sync.getWatchedShows(),
      ]);
      if (movies.status !== 200 || shows.status !== 200) throw new Error("Could not read your history");
      return toWatchedIndex(movies.body, shows.body);
    },
    [],
    {
      onData: setIndex,
      onError: () => setIndex(undefined),
      failureToastOptions: { title: "Could not read your history" },
    },
  );
}
