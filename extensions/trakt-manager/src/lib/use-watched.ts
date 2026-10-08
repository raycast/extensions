import { useCachedState, usePromise } from "@raycast/utils";
import { initTraktClient } from "./client";
import {
  IndexEdit,
  isWatched,
  toWatchedIndex,
  WatchedIndex,
  WatchedTarget,
  withEditsSince,
  withWatched,
} from "./media-state";

const CACHE_KEY = "trakt-watched-index";
const EDIT_TTL_MS = 10 * 60 * 1000;

/** Local watched changes, kept so a read that started before them does not undo them (see `withEditsSince`). */
const watchedEdits: IndexEdit<WatchedIndex>[] = [];

/**
 * Reads what the user has watched, shared like the watchlist ids. `isWatched` is `undefined` while the
 * history is unknown, so "Remove from History" stays offered rather than hidden by mistake.
 */
export function useWatchedState() {
  const [index, setIndex] = useCachedState<WatchedIndex | undefined>(CACHE_KEY);

  return {
    isWatched: (target: WatchedTarget) => (index ? isWatched(index, target) : undefined),
    setWatched: (target: WatchedTarget, watched: boolean) => {
      const apply = (current: WatchedIndex) => withWatched(current, target, watched);
      const now = Date.now();
      watchedEdits.splice(0, watchedEdits.length, ...watchedEdits.filter((edit) => now - edit.at < EDIT_TTL_MS));
      watchedEdits.push({ at: now, apply });
      setIndex((current) => (current ? apply(current) : current));
    },
    setIndex,
  };
}

/** Fetches what the user has watched when a view opens and keeps the shared state in step. */
export function useWatchedSync() {
  const traktClient = initTraktClient();
  const { setIndex } = useWatchedState();

  usePromise(
    async () => {
      const startedAt = Date.now();
      const [movies, shows] = await Promise.all([
        traktClient.sync.getWatchedMovies(),
        traktClient.sync.getWatchedShows(),
      ]);
      if (movies.status !== 200 || shows.status !== 200) throw new Error("Could not read your history");
      return { index: toWatchedIndex(movies.body, shows.body), startedAt };
    },
    [],
    {
      onData: ({ index, startedAt }) => setIndex(withEditsSince(index, watchedEdits, startedAt)),
      onError: () => setIndex(undefined),
      failureToastOptions: { title: "Could not read your history" },
    },
  );
}
