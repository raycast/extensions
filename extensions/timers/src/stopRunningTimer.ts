import { closeMainWindow, showHUD } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { getTimers, stopTimer } from "./backend/timerBackend";

export default async () => {
  try {
    const timers = getTimers();
    if (timers.length === 0) {
      return await showError(new Error("No timers found"), { title: "No Timer to Stop" });
    }
    stopTimer(timers[0].originalFile);
    await closeMainWindow();
    showHUD(`Timer "${timers[0].name}" stopped!`);
  } catch (error) {
    await showError(error, { title: "Could Not Stop Timer" });
  }
};
