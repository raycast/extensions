import { useCachedState, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { initTraktClient } from "./client";
import { scanPageComplete, withPagination } from "./schema";

type WatchlistIds = { movies: number[]; shows: number[] };

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

type IdsPage = { status: number; headers: Headers; body: unknown };

/** Walks a paginated Trakt list until a page is short or the last one, collecting the ids `pick` reads. */
async function collectIds<T>(
  requestPage: (page: number) => Promise<IdsPage>,
  pick: (entry: T) => number,
): Promise<number[]> {
  const ids: number[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await requestPage(page);
    if (response.status !== 200) throw new Error("Could not read your watchlist");

    const { data, pagination } = withPagination(response);
    const entries = data as T[];
    ids.push(...entries.map(pick));

    if (scanPageComplete(entries.length, pagination, PAGE_LIMIT)) break;
  }

  return ids;
}

const CACHE_KEY = "trakt-watchlist-ids";

/**
 * Reads the shared watchlist ids. The state is a cached state under one key, so every component that
 * calls this re-renders when it changes, including a detail view pushed earlier, which would otherwise
 * keep showing the label it was opened with. `undefined` until the list is known.
 */
export function useWatchlistState() {
  const [ids, setIds] = useCachedState<WatchlistIds | undefined>(CACHE_KEY);

  const sets = useMemo(() => (ids ? { movies: new Set(ids.movies), shows: new Set(ids.shows) } : undefined), [ids]);

  const setListed = (type: "movie" | "show", traktId: number, listed: boolean) =>
    setIds((current) => {
      if (!current) return current;
      const key = type === "movie" ? "movies" : "shows";
      const others = current[key].filter((id) => id !== traktId);
      return { ...current, [key]: listed ? [...others, traktId] : others };
    });

  return {
    isMovieWatchlisted: (traktId: number) => sets?.movies.has(traktId),
    isShowWatchlisted: (traktId: number) => sets?.shows.has(traktId),
    setListed,
    setIds,
  };
}

/** Fetches the watchlist ids when a command opens and keeps the shared state in step. Call once per command. */
export function useWatchlistSync() {
  const traktClient = initTraktClient();
  const { setIds } = useWatchlistState();

  const { revalidate } = usePromise(
    async (): Promise<WatchlistIds> => {
      const [movies, shows] = await Promise.all([
        collectIds<{ movie: { ids: { trakt: number } } }>(
          (page) => traktClient.movies.getWatchlistMovieIds({ query: { page, limit: PAGE_LIMIT } }),
          (entry) => entry.movie.ids.trakt,
        ),
        collectIds<{ show: { ids: { trakt: number } } }>(
          (page) => traktClient.shows.getWatchlistShowIds({ query: { page, limit: PAGE_LIMIT } }),
          (entry) => entry.show.ids.trakt,
        ),
      ]);

      return { movies, shows };
    },
    [],
    { onData: setIds, failureToastOptions: { title: "Could not read your watchlist" } },
  );

  return { revalidate };
}
