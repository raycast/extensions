import { Clipboard, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { formatTime } from "../backend/formatUtils";
import {
  getStopwatches,
  pauseStopwatch,
  startStopwatch,
  stopStopwatch,
  unpauseStopwatch,
} from "../backend/stopwatchBackend";
import { Stopwatch, StopwatchLaunchConfig } from "../backend/types";

export default function useStopwatches() {
  const [stopwatches, setStopwatches] = useState<Stopwatch[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(stopwatches === undefined);

  const refreshSWes = () => {
    const setOfStopwatches: Stopwatch[] = getStopwatches();
    setStopwatches(setOfStopwatches);
    setIsLoading(false);
  };

  const handleStartSW = (launchConf: StopwatchLaunchConfig) => {
    startStopwatch(launchConf);
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

  const handleRestartSW = (stopwatch: Stopwatch) => {
    handleStopSW(stopwatch);
    handleStartSW({ swName: stopwatch.name, launchedFromMenuBar: false });
    refreshSWes();
  };

  return {
    stopwatches,
    isLoading,
    refreshSWes,
    handleRestartSW,
    handleStartSW,
    handleStopSW,
    handlePauseSW,
    handleUnpauseSW,
  };
}
