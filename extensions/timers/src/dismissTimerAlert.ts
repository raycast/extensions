import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getTimers, stopTimer } from "./backend/timerBackend";
import { Timer } from "./backend/types";

export default async () => {
  if (!getPreferenceValues().ringContinuously) {
    return await showToast({
      style: Toast.Style.Failure,
      title: "Ring Continuously setting not enabled!",
    });
  }
  const finishedTimers = getTimers().filter((t: Timer) => t.timeLeft === 0);
  if (finishedTimers.length === 0) {
    return await showToast({
      style: Toast.Style.Failure,
      title: "No finished timers found!",
    });
  }
  await closeMainWindow();
  stopTimer(finishedTimers[0].originalFile);
};
