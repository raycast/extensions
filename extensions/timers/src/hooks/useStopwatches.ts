import { Clipboard, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { formatTime } from "../formatUtils";
import { getStopwatches, pauseStopwatch, startStopwatch, stopStopwatch, unpauseStopwatch } from "../stopwatchUtils";
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

  const handlePauseSW = (swID: string) => {
    pauseStopwatch(swID);
    refreshSWes();
  };

  const handleUnpauseSW = (swID: string) => {
    unpauseStopwatch(swID);
    refreshSWes();
  };

  const handleStopSW = (stopwatch: Stopwatch) => {
    const prefs = getPreferenceValues();
    if (prefs.copyOnSwStop) {
      Clipboard.copy(formatTime(stopwatch.timeElapsed));
    }
    stopStopwatch(stopwatch.swID);
    refreshSWes();
  };

  return {
    stopwatches,
    isLoading,
    refreshSWes,
    handleStartSW,
    handleStopSW,
    handlePauseSW,
    handleUnpauseSW,
  };
}
