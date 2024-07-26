import { AbortError } from "node-fetch";
import { MutableRefObject, useCallback, useState } from "react";
import {
  addNewShowProgress,
  addShowToHistory,
  addShowToWatchlist,
  checkInEpisode,
  getEpisodes,
  removeShowFromHistory,
  removeShowFromWatchlist,
  updateShowProgress,
} from "../api/shows";

export const useShowMutations = (abortable: MutableRefObject<AbortController | undefined>) => {
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const addShowToWatchlistMutation = useCallback(
    async (show: TraktShowListItem) => {
      try {
        await addShowToWatchlist(show.show.ids.trakt, abortable.current?.signal);
        setSuccess("Show added to watchlist");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const addShowToHistoryMutation = useCallback(
    async (show: TraktShowListItem) => {
      try {
        await addShowToHistory(show.show.ids.trakt, abortable.current?.signal);
        setSuccess("Show added to history");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const removeShowFromHistoryMutation = useCallback(
    async (show: TraktShowListItem) => {
      try {
        await removeShowFromHistory(show.show.ids.trakt, abortable.current?.signal);
        setSuccess("Show removed from history");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const removeShowFromWatchlistMutation = useCallback(
    async (show: TraktShowListItem) => {
      try {
        await removeShowFromWatchlist(show.show.ids.trakt, abortable.current?.signal);
        setSuccess("Show removed from watchlist");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  const checkInNextEpisodeMutation = useCallback(
    async (show: TraktShowListItem) => {
      if (show.show.progress?.next_episode) {
        try {
          await checkInEpisode(show.show.progress?.next_episode.ids.trakt, abortable.current?.signal);
          await updateShowProgress(show.show.ids.trakt, abortable.current?.signal);
          setSuccess("Episode checked in");
        } catch (e) {
          if (!(e instanceof AbortError)) {
            setError(e as Error);
          }
        }
      }
    },
    [abortable],
  );

  const checkInFirstEpisodeMutation = useCallback(
    async (show: TraktShowListItem) => {
      try {
        const episodes = await getEpisodes(show.show.ids.trakt, 1, abortable.current?.signal);
        if (episodes) {
          const firstEpisode = episodes.find((e) => e.number === 1);
          if (firstEpisode) {
            await checkInEpisode(firstEpisode.ids.trakt, abortable.current?.signal);
            await addNewShowProgress(show, abortable.current?.signal);
            setSuccess("First episode checked-in");
            return;
          }
        }
        setError(new Error("First episode not found"));
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  return {
    addShowToWatchlistMutation,
    addShowToHistoryMutation,
    removeShowFromHistoryMutation,
    removeShowFromWatchlistMutation,
    checkInNextEpisodeMutation,
    checkInFirstEpisodeMutation,
    error,
    success,
  };
};
