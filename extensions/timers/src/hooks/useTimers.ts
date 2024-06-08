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
  toggleCustomTimerMenubarVisibility,
} from "../backend/timerBackend";
import { CTLaunchConfig, CustomTimer, Timer, TimerLaunchConfig } from "../backend/types";
import { Alert, Icon, confirmAlert } from "@raycast/api";

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

  const handleStartTimer = (launchConf: TimerLaunchConfig) => {
    if (!checkForOverlyLoudAlert(launchConf.launchedFromMenuBar)) return;
    startTimer(launchConf);
    refreshTimers();
  };

  const handleStopTimer = (timer: Timer) => {
    setTimers(timers?.filter((t: Timer) => t.originalFile !== timer.originalFile));
    stopTimer(timer.originalFile);
    refreshTimers();
  };

  const handleStartCT = ({ customTimer, launchedFromMenuBar }: CTLaunchConfig) => {
    if (!checkForOverlyLoudAlert(launchedFromMenuBar)) return;
    startTimer({
      timeInSeconds: customTimer.timeInSeconds,
      launchedFromMenuBar: launchedFromMenuBar,
      timerName: customTimer.name,
      selectedSound: customTimer.selectedSound,
    });
    refreshTimers();
  };

  const handleCreateCT = (timer: Timer) => {
    // TODO: make it possible to provide selected sound into CustomTimer
    const customTimer: CustomTimer = {
      name: timer.name,
      timeInSeconds: timer.secondsSet,
      selectedSound: "default",
      showInMenuBar: true,
    };
    createCustomTimer(customTimer);
    refreshTimers();
  };

  const handleDeleteCT = async (ctID: string) => {
    const options: Alert.Options = {
      title: "Delete this preset?",
      icon: Icon.Trash,
      message: "You won't be able to recover it.",
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    };
    if (await confirmAlert(options)) {
      deleteCustomTimer(ctID);
      refreshTimers();
    }
  };

  const handleToggleCTVisibility = async (ctID: string) => {
    toggleCustomTimerMenubarVisibility(ctID);
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
    handleToggleCTVisibility,
  };
}
