import { environment } from "@raycast/api";
import { useState } from "react";
import { getStopwatches, startStopwatch, stopStopwatch } from "../stopwatchUtils";
import { Stopwatch } from "../types";

export default function useStopwatches() {
  const [stopwatches, setStopwatches] = useState<Stopwatch[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(stopwatches === undefined);

  const refreshSWes = () => {
    const setOfStopwatches: Stopwatch[] = getStopwatches();
    setStopwatches(setOfStopwatches);
    setIsLoading(false);
  };

  const handleStartSW = () => {
    startStopwatch();
    refreshSWes();
  };

  const handleStopSW = (stopwatch: Stopwatch) => {
    setStopwatches(stopwatches?.filter((s: Stopwatch) => s.originalFile !== stopwatch.originalFile));
    stopStopwatch(`${environment.supportPath}/${stopwatch.originalFile}`);
    refreshSWes();
  };

  return {
    stopwatches,
    isLoading,
    refreshSWes,
    handleStartSW,
    handleStopSW,
  };
}
