import { showHUD } from "@raycast/api";
import { startTimer } from "./timer";
import { stopRunning } from "./session";
import { getAppPreferences } from "./preferences";

export default async function QuickStartCommand() {
  const { pomoDuration, quickStartTask } = getAppPreferences();

  // Stop (and log) any in-progress session instead of silently discarding it.
  await stopRunning();
  await startTimer(quickStartTask, pomoDuration);
  await showHUD(`🍅 ${quickStartTask} — ${pomoDuration}min`);
}
