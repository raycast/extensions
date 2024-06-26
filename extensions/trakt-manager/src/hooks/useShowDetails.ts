import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getTMDBShowDetails } from "../api/tmdb";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useShowDetails(showsList: TraktShowList | undefined) {
  const abortable = useRef<AbortController>();
  const [details, setDetails] = useState<ShowDetailsMap>(new Map());
  const [error, setError] = useState<Error | undefined>();

  const fetchShowDetails = useCallback(async (showsList: TraktShowList) => {
    try {
      const updatedDetailedShows = new Map();

      await Promise.all(
        showsList.map(async (show) => {
          if (!updatedDetailedShows.has(show.show.ids.trakt)) {
            const details = await getTMDBShowDetails(show.show.ids.tmdb, abortable.current?.signal);
            updatedDetailedShows.set(show.show.ids.trakt, details);
          }
        }),
      );

      setDetails(updatedDetailedShows);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (showsList) {
        if (abortable.current) {
          abortable.current.abort();
        }
        abortable.current = new AbortController();
        setMaxListeners(APP_MAX_LISTENERS, abortable.current.signal);
        await fetchShowDetails(showsList);
      }
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [showsList, fetchShowDetails]);

  return {
    details,
    error,
  };
}
