import { environment } from "@raycast/api";
import { useState } from "react";
import {
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

  const handleStartTimer = (seconds: number, name: string) => {
    startTimer(seconds, name);
    refreshTimers();
  };

  const handleStopTimer = (timer: Timer) => {
    setTimers(timers?.filter((t: Timer) => t.originalFile !== timer.originalFile));
    stopTimer(`${environment.supportPath}/${timer.originalFile}`);
    refreshTimers();
  };

  const handleStartCT = (customTimer: CustomTimer) => {
    startTimer(customTimer.timeInSeconds, customTimer.name);
    refreshTimers();
  };

  const handleCreateCT = (timer: Timer) => {
    const customTimer: CustomTimer = {
      name: timer.name,
      timeInSeconds: timer.secondsSet,
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
