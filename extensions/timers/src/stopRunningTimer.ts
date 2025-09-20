import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { getTimers, stopTimer } from "./backend/timerBackend";

export default async () => {
  const timers = getTimers();
  if (timers.length === 0) {
    return await showToast({
      style: Toast.Style.Failure,
      title: "No timers found!",
    });
  }
  stopTimer(timers[0].originalFile);
  await closeMainWindow();
  showHUD(`Timer "${timers[0].name}" stopped!`);
};
