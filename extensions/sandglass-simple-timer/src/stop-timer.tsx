import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { currentTimer, loadState, stopCurrent } from "./lib/timer-service.ts";

export default async function Command() {
  try {
    if (!currentTimer(loadState())) return await showHUD("No timer to stop");
    stopCurrent();
    await showHUD("⏹ Timer stopped");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't stop the timer" });
  }
}
