import { showHUD } from "@raycast/api";
import { describeError, stopSession } from "./session";

export default async function StopTimerCommand() {
  const result = await stopSession();

  if (result.status === "busy") {
    await showHUD("⏳ Timer is busy — try again");
    return;
  }
  if (result.status === "error") {
    await showHUD(
      `⚠️ Could not stop the timer: ${describeError(result.error)}`,
    );
    return;
  }

  if (result.finished) {
    // Ran out before we got here; it has been logged as completed.
    const label = result.finished.subtaskTitle || result.finished.taskTitle;
    await showHUD(
      result.finished.isBreak ? "☕ Break over" : `✅ ${label} — done!`,
    );
    return;
  }

  if (!result.stopped) {
    await showHUD("No active timer");
    return;
  }

  const label = result.stopped.subtaskTitle || result.stopped.taskTitle;
  await showHUD(
    result.stopped.isBreak ? "☕ Break stopped" : `⏹ ${label} — stopped`,
  );
}
