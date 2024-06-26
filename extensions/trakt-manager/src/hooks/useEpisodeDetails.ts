import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTMDBEpisodeDetails } from "../api/tmdb";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useEpisodeDetails(tmdbId: number, seasonNumber: number, episodeList: TraktEpisodeList | undefined) {
  const abortable = useRef<AbortController>();
  const [details, setDetails] = useState<EpisodeDetailsMap>(new Map());
  const [error, setError] = useState<Error | undefined>();

  const fetchEpisodeDetails = useCallback(
    async (episodeList: TraktEpisodeList) => {
      try {
        const updatedDetailedEpisodes = new Map();

        await Promise.all(
          episodeList.map(async (episode) => {
            if (!updatedDetailedEpisodes.has(episode.ids.trakt)) {
              const details = await getTMDBEpisodeDetails(
                tmdbId,
                seasonNumber,
                episode.number,
                abortable.current?.signal,
              );
              updatedDetailedEpisodes.set(episode.ids.trakt, details);
            }
          }),
        );

        setDetails(updatedDetailedEpisodes);
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [tmdbId, seasonNumber],
  );

  useEffect(() => {
    (async () => {
      if (episodeList) {
        if (abortable.current) {
          abortable.current.abort();
        }
        abortable.current = new AbortController();
        setMaxListeners(APP_MAX_LISTENERS, abortable.current.signal);
        await fetchEpisodeDetails(episodeList);
      }
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [episodeList, fetchEpisodeDetails]);

  return {
    details,
    error,
  };
}
