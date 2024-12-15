import { AbortError } from "node-fetch";
import { MutableRefObject, useCallback, useState } from "react";
import {
  addMovieToHistory,
  addMovieToWatchlist,
  checkInMovie,
  removeMovieFromHistory,
  removeMovieFromWatchlist,
} from "../api/movies";

export const useMovieMutations = (abortable: MutableRefObject<AbortController | undefined>) => {
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const addMovieToWatchlistMutation = useCallback(
    async (movie: TraktMovieListItem) => {
      try {
        await addMovieToWatchlist(movie.movie.ids.trakt, abortable.current?.signal);
        setSuccess("Movie added to watchlist");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const checkInMovieMutation = useCallback(
    async (movie: TraktMovieListItem) => {
      try {
        await checkInMovie(movie.movie.ids.trakt, abortable.current?.signal);
        setSuccess("Movie checked in");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const addMovieToHistoryMutation = useCallback(
    async (movie: TraktMovieListItem) => {
      try {
        await addMovieToHistory(movie.movie.ids.trakt, abortable.current?.signal);
        setSuccess("Movie added to history");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const removeMovieFromHistoryMutation = useCallback(
    async (movie: TraktMovieListItem) => {
      try {
        await removeMovieFromHistory(movie.movie.ids.trakt, abortable.current?.signal);
        setSuccess("Movie removed from history");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const removeMovieFromWatchlistMutation = useCallback(
    async (movie: TraktMovieListItem) => {
      try {
        await removeMovieFromWatchlist(movie.movie.ids.trakt, abortable.current?.signal);
        setSuccess("Movie removed from watchlist");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  return {
    addMovieToWatchlistMutation,
    checkInMovieMutation,
    addMovieToHistoryMutation,
    removeMovieFromHistoryMutation,
    removeMovieFromWatchlistMutation,
    error,
    success,
  };
};
