import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { getTimers, stopTimer } from "./backend/timerBackend";
import { Timer } from "./backend/types";

export default async () => {
  try {
    if (!getPreferenceValues().ringContinuously) {
      return await showError(new Error("Enable Ring Continuously to keep timer alerts ringing"), {
        title: "No Continuous Alert to Dismiss",
      });
    }
    const finishedTimers = getTimers().filter((t: Timer) => t.timeLeft === 0);
    if (finishedTimers.length === 0) {
      return await showError(new Error("No finished timers found"), { title: "No Alert to Dismiss" });
    }
    await closeMainWindow();
    stopTimer(finishedTimers[0].originalFile);
  } catch (error) {
    await showError(error, { title: "Could Not Dismiss Alert" });
  }
};
