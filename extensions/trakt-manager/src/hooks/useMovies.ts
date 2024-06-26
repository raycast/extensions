import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { addMovieToHistory, addMovieToWatchlist, checkInMovie, searchMovies } from "../api/movies";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useMovies(searchText: string | undefined, page: number) {
  const abortable = useRef<AbortController>();
  const [movies, setMovies] = useState<TraktMovieList | undefined>();
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const fetchMovies = useCallback(async () => {
    if (!searchText) {
      setMovies(undefined);
      return;
    }
    try {
      const movies = await searchMovies(searchText, page, abortable.current?.signal);
      setMovies(movies);
      setTotalPages(movies.total_pages);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, [searchText, page]);

  const addMovieToWatchlistMutation = useCallback(async (movie: TraktMovieListItem) => {
    try {
      await addMovieToWatchlist(movie.movie.ids.trakt, abortable.current?.signal);
      setSuccess("Movie added to watchlist");
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, []);

  const checkInMovieMutation = useCallback(async (movie: TraktMovieListItem) => {
    try {
      await checkInMovie(movie.movie.ids.trakt, abortable.current?.signal);
      setSuccess("Movie checked in");
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, []);

  const addMovieToHistoryMutation = useCallback(async (movie: TraktMovieListItem) => {
    try {
      await addMovieToHistory(movie.movie.ids.trakt, abortable.current?.signal);
      setSuccess("Movie added to history");
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (abortable.current) {
        abortable.current.abort();
      }
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current.signal);
      await fetchMovies();
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [fetchMovies]);

  return {
    movies,
    addMovieToWatchlistMutation,
    checkInMovieMutation,
    addMovieToHistoryMutation,
    error,
    success,
    totalPages,
  };
}
