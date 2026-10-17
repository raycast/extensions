import { useState } from "react";
import {
  checkForOverlyLoudAlert,
  createCustomTimer,
  deleteCustomTimer,
  ensureCTFileExists,
  getTimers,
  pauseTimer,
  readCustomTimers,
  startTimer,
  stopTimer,
  toggleCustomTimerMenubarVisibility,
  unpauseTimer,
  recoverWindowsTimers,
} from "../backend/timerBackend";
import { CTLaunchConfig, CustomTimer, Timer, TimerLaunchConfig } from "../backend/types";
import { Alert, Icon, confirmAlert } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";

export default function useTimers() {
  const [timers, setTimers] = useState<Timer[] | undefined>(undefined);
  const [customTimers, setCustomTimers] = useState<Record<string, CustomTimer>>({});
  const [isLoading, setIsLoading] = useState<boolean>(timers === undefined);

  const refreshTimers = async () => {
    try {
      await recoverWindowsTimers();
      ensureCTFileExists();
      const setOfTimers: Timer[] = getTimers();
      setTimers(setOfTimers);
      const setOfCustomTimers: Record<string, CustomTimer> = readCustomTimers();
      setCustomTimers(setOfCustomTimers);
    } catch (error) {
      await showError(error, { title: "Could Not Load Timers" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = async (launchConf: TimerLaunchConfig) => {
    if (!checkForOverlyLoudAlert(launchConf.launchedFromMenuBar)) return;
    try {
      await startTimer(launchConf);
      await refreshTimers();
    } catch (error) {
      await showError(error, { title: "Could Not Start Timer" });
    }
  };

  const handleStopTimer = async (timer: Timer) => {
    try {
      stopTimer(timer.originalFile);
      setTimers((current) => current?.filter((t: Timer) => t.originalFile !== timer.originalFile));
      await refreshTimers();
    } catch (error) {
      await showError(error, { title: "Could Not Stop Timer" });
    }
  };

  const handlePauseTimer = async (timer: Timer) => {
    // cannot migrate old timers as we don't know PID
    if (timer.pid == undefined && !timer.workerId && timer.lastPaused === "---")
      return showError(new Error("Restart this legacy timer to enable pausing"), { title: "Could Not Pause Timer" });
    try {
      pauseTimer(timer.originalFile, timer.pid!);
      await refreshTimers();
    } catch (error) {
      await showError(error, { title: "Could Not Pause Timer" });
    }
  };

  const handleUnpauseTimer = async (timer: Timer) => {
    // cannot migrate old timers as we don't know PID
    if (timer.pid == undefined && !timer.workerId && timer.lastPaused === "---")
      return showError(new Error("Restart this legacy timer to enable pausing"), { title: "Could Not Resume Timer" });
    try {
      await unpauseTimer(timer);
      await refreshTimers();
    } catch (error) {
      await showError(error, { title: "Could Not Resume Timer" });
    }
  };

  const handleStartCT = ({ customTimer, launchedFromMenuBar }: CTLaunchConfig) => {
    return handleStartTimer({
      timeInSeconds: customTimer.timeInSeconds,
      launchedFromMenuBar: launchedFromMenuBar,
      timerName: customTimer.name,
      selectedSound: customTimer.selectedSound,
    });
  };

  const handleCreateCT = async (timer: Timer) => {
    const customTimer: CustomTimer = {
      name: timer.name,
      timeInSeconds: timer.secondsSet,
      selectedSound: timer.selectedSound,
      showInMenuBar: true,
    };
    try {
      createCustomTimer(customTimer);
      await refreshTimers();
    } catch (error) {
      await showError(error, { title: "Could Not Save Preset" });
    }
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
      try {
        deleteCustomTimer(ctID);
        await refreshTimers();
      } catch (error) {
        await showError(error, { title: "Could Not Delete Preset" });
      }
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
    handlePauseTimer,
    handleUnpauseTimer,
    handleStopTimer,
    handleStartCT,
    handleCreateCT,
    handleDeleteCT,
    handleToggleCTVisibility,
  };
}
