import { useState } from "react";
import {
  createCustomTimer,
  deleteCustomTimer,
  ensureCTFileExists,
  getTimer,
  readCustomTimers,
  startTimer,
  stopTimer,
} from "../timerUtils";
import { CustomTimer, Timer } from "../types";

export default function useTimers() {
  const [timer, setTimer] = useState<Timer | undefined>(undefined);
  const [customTimers, setCustomTimers] = useState<Record<string, CustomTimer>>({});
  const [isLoading, setIsLoading] = useState<boolean>(timer === undefined);

  const refreshTimers = () => {
    ensureCTFileExists();
    const t = getTimer();
    setTimer(t);
    const setOfCustomTimers: Record<string, CustomTimer> = readCustomTimers();
    setCustomTimers(setOfCustomTimers);
    setIsLoading(false);
  };

  const handleStartTimer = (seconds: number, name: string) => {
    startTimer(seconds, name);
    refreshTimers();
  };

  const handleStopTimer = () => {
    stopTimer();
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
    timer,
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
