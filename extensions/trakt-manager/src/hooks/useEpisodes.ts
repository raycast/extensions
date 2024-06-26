import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkInEpisode, getEpisodes } from "../api/shows";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useEpisodes(showId: number, seasonNumber: number) {
  const abortable = useRef<AbortController>();
  const [episodes, setEpisodes] = useState<TraktEpisodeList | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const fetchEpisodes = useCallback(async () => {
    try {
      const episodes = await getEpisodes(showId, seasonNumber, abortable.current?.signal);
      setEpisodes(episodes);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, [showId, seasonNumber]);

  const checkInEpisodeMutation = useCallback(async (episode: TraktEpisodeListItem) => {
    try {
      await checkInEpisode(episode.ids.trakt, abortable.current?.signal);
      setSuccess("Episode checked in");
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
      await fetchEpisodes();
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [fetchEpisodes]);

  return {
    episodes,
    checkInEpisodeMutation,
    error,
    success,
  };
}
