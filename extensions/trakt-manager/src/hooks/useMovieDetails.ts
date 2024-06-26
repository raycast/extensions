import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTMDBMovieDetails } from "../api/tmdb";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useMovieDetails(movieList: TraktMovieList | undefined) {
  const abortable = useRef<AbortController>();
  const [details, setDetails] = useState<MovieDetailsMap>(new Map());
  const [error, setError] = useState<Error | undefined>();

  const fetchMovieDetails = useCallback(async (moviesList: TraktMovieList) => {
    try {
      const updatedDetailedMovies = new Map();

      await Promise.all(
        moviesList.map(async (movie) => {
          if (!updatedDetailedMovies.has(movie.movie.ids.trakt)) {
            const details = await getTMDBMovieDetails(movie.movie.ids.tmdb, abortable.current?.signal);
            updatedDetailedMovies.set(movie.movie.ids.trakt, details);
          }
        }),
      );

      setDetails(updatedDetailedMovies);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (movieList) {
        if (abortable.current) {
          abortable.current.abort();
        }
        abortable.current = new AbortController();
        setMaxListeners(APP_MAX_LISTENERS, abortable.current.signal);
        await fetchMovieDetails(movieList);
      }
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [movieList, fetchMovieDetails]);

  return {
    details,
    error,
  };
}
