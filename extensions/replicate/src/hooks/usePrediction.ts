import { useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { Prediction } from "../types";
import { replicateFetch } from "../lib/replicate";
import { POLL_INTERVAL_MS, isRunning } from "../utils/status";

export const usePrediction = (id: string, initial?: Prediction) => {
  const { data, isLoading, error, revalidate } = usePromise(
    (predictionId: string) => replicateFetch<Prediction>(`/predictions/${predictionId}`),
    [id],
  );

  const prediction = data ?? initial;
  const waiting = prediction ? isRunning(prediction) : false;

  useEffect(() => {
    if (!waiting || isLoading) return;
    const timer = setTimeout(revalidate, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [waiting, isLoading, revalidate]);

  return { prediction, isLoading, error, revalidate };
};
