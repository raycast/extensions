import { AbortError } from "node-fetch";
import { setMaxListeners } from "node:events";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHistoryShows, removeShowFromHistory } from "../api/shows";
import { APP_MAX_LISTENERS } from "../lib/constants";

export const useHistoryShows = (page: number, shouldFetch: boolean) => {
  const abortable = useRef<AbortController>();
  const [shows, setShows] = useState<TraktShowList | undefined>();
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const fetchShows = useCallback(async () => {
    try {
      const showHistory = await getHistoryShows(page, abortable.current?.signal);
      setShows(showHistory);
      setTotalPages(showHistory.total_pages);
    } catch (e) {
      if (!(e instanceof AbortError)) {
        setError(e as Error);
      }
    }
  }, [page]);

  const removeShowFromHistoryMutation = async (show: TraktShowListItem) => {
    try {
      await removeShowFromHistory(show.show.ids.trakt, abortable.current?.signal);
      setSuccess("Show removed from history");
      await fetchShows();
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
        await fetchShows();
      }
    })();
    return () => {
      if (abortable.current) {
        abortable.current.abort();
      }
    };
  }, [fetchShows, shouldFetch]);

  return { shows, totalPages, removeShowFromHistoryMutation, error, success };
};
