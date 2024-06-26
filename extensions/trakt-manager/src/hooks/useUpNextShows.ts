import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkInEpisode, getUpNextShows, updateShowProgress } from "../api/shows";
import { APP_MAX_LISTENERS } from "../lib/constants";

export function useUpNextShows(page: number) {
  const abortable = useRef<AbortController>();
  const [shows, setShows] = useState<TraktShowList | undefined>();
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const fetchShows = useCallback(async () => {
    try {
      const showHistory = await getUpNextShows(abortable.current?.signal);
      setShows(showHistory);
      setTotalPages(showHistory.total_pages);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, [page]);

  const checkInNextEpisodeMutation = async (show: TraktShowListItem) => {
    if (show.show.progress?.next_episode) {
      try {
        await checkInEpisode(show.show.progress?.next_episode.ids.trakt, abortable.current?.signal);
        await updateShowProgress(show.show.ids.trakt, abortable.current?.signal);
        setSuccess("Episode checked in");
        await fetchShows();
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    }
  };

  useEffect(() => {
    (async () => {
      if (abortable.current) {
        abortable.current.abort();
      }
      abortable.current = new AbortController();
      setMaxListeners(APP_MAX_LISTENERS, abortable.current.signal);
      await fetchShows();
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [fetchShows]);

  return { shows, totalPages, checkInNextEpisodeMutation, error, success };
}
