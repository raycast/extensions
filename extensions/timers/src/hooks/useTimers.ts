import { environment } from "@raycast/api";
import { useState } from "react";
import {
  checkForOverlyLoudAlert,
  createCustomTimer,
  deleteCustomTimer,
  ensureCTFileExists,
  getTimers,
  readCustomTimers,
  startTimer,
  stopTimer,
} from "../timerUtils";
import { CustomTimer, Timer } from "../types";

export default function useTimers() {
  const [timers, setTimers] = useState<Timer[] | undefined>(undefined);
  const [customTimers, setCustomTimers] = useState<Record<string, CustomTimer>>({});
  const [isLoading, setIsLoading] = useState<boolean>(timers === undefined);

  const refreshTimers = () => {
    ensureCTFileExists();
    const setOfTimers: Timer[] = getTimers();
    setTimers(setOfTimers);
    const setOfCustomTimers: Record<string, CustomTimer> = readCustomTimers();
    setCustomTimers(setOfCustomTimers);
    setIsLoading(false);
  };

  const handleStartTimer = (seconds: number, name: string, launchedFromMenuBar = false) => {
    if (!checkForOverlyLoudAlert(launchedFromMenuBar)) return;
    startTimer(seconds, name);
    refreshTimers();
  };

  const handleStopTimer = (timer: Timer) => {
    setTimers(timers?.filter((t: Timer) => t.originalFile !== timer.originalFile));
    stopTimer(`${environment.supportPath}/${timer.originalFile}`);
    refreshTimers();
  };

  const handleStartCT = (customTimer: CustomTimer, launchedFromMenuBar = false) => {
    if (!checkForOverlyLoudAlert(launchedFromMenuBar)) return;
    startTimer(customTimer.timeInSeconds, customTimer.name, customTimer.selectedSound);
    refreshTimers();
  };

  const handleCreateCT = (timer: Timer) => {
    // TODO: make it possible to provide selected sound into CustomTimer
    const customTimer: CustomTimer = {
      name: timer.name,
      timeInSeconds: timer.secondsSet,
      selectedSound: "default",
    };
    createCustomTimer(customTimer);
    refreshTimers();
  };

  const handleDeleteCT = (ctID: string) => {
    deleteCustomTimer(ctID);
    refreshTimers();
  };

  return {
    timers,
    customTimers,
    isLoading,
    refreshTimers,
    handleStartTimer,
    handleStopTimer,
    handleStartCT,
    handleCreateCT,
    handleDeleteCT,
  };
}
