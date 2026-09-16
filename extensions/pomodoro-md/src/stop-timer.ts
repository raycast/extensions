import { showHUD } from "@raycast/api";
import { settle, finish } from "./session";

export default async function StopTimerCommand() {
  const { running, finished } = await settle();

  if (finished) {
    // Ran out before we got here; settle() already logged it as completed.
    const label = finished.subtaskTitle || finished.taskTitle;
    await showHUD(finished.isBreak ? "☕ Break over" : `✅ ${label} — done!`);
    return;
  }

  if (!running) {
    await showHUD("No active timer");
    return;
  }

  if (!(await finish(running, false))) {
    // Claimed by another command (or replaced) between settle() and here.
    await showHUD("No active timer");
    return;
  }
  const label = running.subtaskTitle || running.taskTitle;
  await showHUD(running.isBreak ? "☕ Break stopped" : `⏹ ${label} — stopped`);
}
