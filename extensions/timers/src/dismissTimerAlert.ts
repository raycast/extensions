import { closeMainWindow, environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { unlinkSync } from "fs";
import { getTimers } from "./timerUtils";
import { Timer } from "./types";

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
  const dismissFile = finishedTimers[0].originalFile.replace(".timer", ".dismiss");
  unlinkSync(environment.supportPath + "/" + dismissFile);
};
