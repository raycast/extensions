import { showHUD } from "@raycast/api";
import { startSession } from "./session";
import { getAppPreferences } from "./preferences";

export default async function QuickStartCommand() {
  const { pomoDuration, quickStartTask } = getAppPreferences();

  // Anything already running is stopped and logged first, in the same step.
  const result = await startSession({
    taskTitle: quickStartTask,
    durationMinutes: pomoDuration,
  });
  if (result.status === "busy") {
    await showHUD("⏳ Timer is busy — try again");
    return;
  }
  await showHUD(`🍅 ${quickStartTask} — ${pomoDuration}min`);
}
