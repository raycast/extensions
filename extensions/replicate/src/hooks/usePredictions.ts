import { useCallback, useEffect, useRef, useState } from "react";
import { Prediction, PredictionResponse } from "../types";
import { getPrediction, replicateFetch } from "../lib/replicate";
import { POLL_INTERVAL_MS, isRunning } from "../utils/status";

const FIRST_PAGE = "/predictions";
const MAX_POLLED = 5;

export const mergePage = (current: Prediction[], page: Prediction[]) => {
  const listed = new Set(current.map((prediction) => prediction.id));
  return [...current, ...page.filter((prediction) => !listed.has(prediction.id))];
};

export const usePredictions = () => {
  const [loaded, setLoaded] = useState<Prediction[]>();
  const [next, setNext] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  // One page at a time, and never the same page twice, or the list loops on a repeated cursor.
  const busy = useRef(false);
  const requested = useRef(new Set<string>());
  const generation = useRef(0);

  const load = useCallback(async (url: string, { reset = false } = {}) => {
    if (!reset && (busy.current || requested.current.has(url))) return;
    if (reset) {
      generation.current += 1;
      requested.current = new Set();
    }
    const current = generation.current;
    busy.current = true;
    requested.current.add(url);
    setIsLoading(true);
    try {
      const response = await replicateFetch<PredictionResponse>(url);
      if (current !== generation.current) return;
      setLoaded((listed) => mergePage(reset ? [] : (listed ?? []), response.results));
      setNext(response.next && !requested.current.has(response.next) ? response.next : null);
      setError(undefined);
    } catch (caught) {
      if (current === generation.current) setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      if (current === generation.current) {
        busy.current = false;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load(FIRST_PAGE, { reset: true });
  }, [load]);

  // Kept apart from the paged data so a status refresh never disturbs paging.
  const [live, setLive] = useState<Record<string, Prediction>>({});
  const predictions = loaded?.map((prediction) => live[prediction.id] ?? prediction);
  const ids = (predictions ?? [])
    .filter(isRunning)
    .slice(0, MAX_POLLED)
    .map((prediction) => prediction.id)
    .join(",");

  useEffect(() => {
    if (!ids) return;
    const timer = setTimeout(async () => {
      try {
        const updated = await Promise.all(ids.split(",").map(getPrediction));
        setLive((current) => ({ ...current, ...Object.fromEntries(updated.map((p) => [p.id, p])) }));
      } catch {
        // A failed poll leaves the last known status; the next one tries again.
        setLive((current) => ({ ...current }));
      }
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [ids, live]);

  const revalidate = () => {
    setLive({});
    return load(FIRST_PAGE, { reset: true });
  };

  return {
    data: predictions,
    isLoading,
    error,
    revalidate,
    pagination: {
      pageSize: 100,
      hasMore: Boolean(next),
      onLoadMore: () => {
        if (next) load(next);
      },
    },
  };
};
