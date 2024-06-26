import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useEffect, useRef, useState } from "react";
import { getSeasons } from "../api/shows";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useSeasons(showId: number) {
  const abortable = useRef<AbortController>();
  const [seasons, setSeasons] = useState<TraktSeasonList | undefined>();
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    (async () => {
      if (abortable.current) {
        abortable.current.abort();
      }
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current.signal);
      try {
        const fetchedSeasons = await getSeasons(showId, abortable.current.signal);
        setSeasons(fetchedSeasons);
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
      return () => {
        if (abortable.current) {
          abortable.current.abort();
        }
      };
    })();
  }, [showId]);

  return {
    seasons,
    error,
  };
}
