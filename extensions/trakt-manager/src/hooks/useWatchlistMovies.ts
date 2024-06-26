import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkInMovie, getWatchlistMovies, removeMovieFromWatchlist } from "../api/movies";
import { APP_MAX_LISTENERS } from "../lib/constants";

export const useWatchlistMovies = (page: number, shouldFetch: boolean) => {
  const abortable = useRef<AbortController>();
  const [movies, setMovies] = useState<TraktMovieList | undefined>();
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const fetchMovies = useCallback(async () => {
    try {
      const movieWatchlist = await getWatchlistMovies(page, abortable.current?.signal);
      setMovies(movieWatchlist);
      setTotalPages(movieWatchlist.total_pages);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, [page]);

  const removeMovieFromWatchlistMutation = async (movie: TraktMovieListItem) => {
    try {
      await removeMovieFromWatchlist(movie.movie.ids.trakt, abortable.current?.signal);
      setSuccess("Movie removed from watchlist");
      await fetchMovies();
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  };

  const checkInMovieMutation = useCallback(async (movie: TraktMovieListItem) => {
    try {
      await checkInMovie(movie.movie.ids.trakt, abortable.current?.signal);
      setSuccess("Movie checked in");
      await fetchMovies();
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (shouldFetch) {
        if (abortable.current) {
          abortable.current.abort();
        }
        abortable.current = new AbortController();
        setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
        await fetchMovies();
      }
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [fetchMovies, shouldFetch]);

  return {
    movies,
    totalPages,
    removeMovieFromWatchlistMutation,
    checkInMovieMutation,
    error,
    success,
  };
};
