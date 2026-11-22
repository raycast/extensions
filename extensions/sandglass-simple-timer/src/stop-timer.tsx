import { showHUD } from "@raycast/api";
import { currentTimer, loadState, stopCurrent } from "./lib/timer-service.ts";

export default async function Command() {
  if (!currentTimer(loadState())) return showHUD("No timer to stop");
  stopCurrent();
  return showHUD("⏹ Timer stopped");
}
