import { closeMainWindow, environment, showToast, Toast } from "@raycast/api";
import { unlinkSync } from "fs";
import { getTimers } from "./timerUtils";
import { Timer } from "./types";

export default async () => {
  const timers = getTimers();
  timers.filter((t: Timer) => t.timeLeft === 0);
  if (timers.length === 0) {
    return await showToast({
      style: Toast.Style.Failure,
      title: "No finished timers found!",
    });
  }
  await closeMainWindow();
  const dismissFile = timers[0].originalFile.replace(".timer", ".dismiss");
  unlinkSync(environment.supportPath + "/" + dismissFile);
};
