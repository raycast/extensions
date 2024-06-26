import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTMDBSeasonDetails } from "../api/tmdb";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useSeasonDetails(tmdbId: number, seasonList: TraktSeasonList | undefined) {
  const abortable = useRef<AbortController>();
  const [details, setDetails] = useState<SeasonDetailsMap>(new Map());
  const [error, setError] = useState<Error | undefined>();

  const fetchSeasonDetails = useCallback(
    async (seasonList: TraktSeasonList) => {
      try {
        const updatedDetailedSeasons = new Map();

        await Promise.all(
          seasonList.map(async (season) => {
            if (!updatedDetailedSeasons.has(season.ids.trakt)) {
              const details = await getTMDBSeasonDetails(tmdbId, season.number, abortable.current?.signal);
              updatedDetailedSeasons.set(season.ids.trakt, details);
            }
          }),
        );

        setDetails(updatedDetailedSeasons);
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [tmdbId],
  );

  useEffect(() => {
    (async () => {
      if (seasonList) {
        if (abortable.current) {
          abortable.current.abort();
        }
        abortable.current = new AbortController();
        setMaxListeners(APP_MAX_LISTENERS, abortable.current.signal);
        await fetchSeasonDetails(seasonList);
      }
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [seasonList, fetchSeasonDetails]);

  return {
    details,
    error,
  };
}
