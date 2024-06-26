import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHistoryMovies, removeMovieFromHistory } from "../api/movies";
import { APP_MAX_LISTENERS } from "../lib/constants";

export const useHistoryMovies = (page: number, shouldFetch: boolean) => {
  const abortable = useRef<AbortController>();
  const [movies, setMovies] = useState<TraktMovieList | undefined>();
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const fetchMovies = useCallback(async () => {
    try {
      const movieHistory = await getHistoryMovies(page, abortable.current?.signal);
      setMovies(movieHistory);
      setTotalPages(movieHistory.total_pages);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, [page]);

  const removeMovieFromHistoryMutation = async (movie: TraktMovieListItem) => {
    try {
      await removeMovieFromHistory(movie.movie.ids.trakt, abortable.current?.signal);
      setSuccess("Movie removed from history");
      await fetchMovies();
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  };

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

  return { movies, totalPages, removeMovieFromHistoryMutation, error, success };
};
