import { Clipboard, environment, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { formatTime } from "../formatUtils";
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
    const prefs = getPreferenceValues();
    if (prefs.copyOnSwStop) {
      Clipboard.copy(formatTime(stopwatch.timeElapsed));
    }
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
