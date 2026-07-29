import { showHUD } from "@raycast/api";
import { getTimerState, resumeTimer } from "./teamwork";

export default async function Command() {
  try {
    const { running, paused } = await getTimerState();
    if (running) {
      await showHUD("Timer is already running");
      return;
    }
    const timer = paused[0];
    if (!timer) {
      await showHUD("No paused timer found");
      return;
    }
    await resumeTimer(timer.id);
    await showHUD(`Resumed: ${timer.taskName ?? "Teamwork timer"}`);
  } catch (error) {
    await showHUD(
      `Could not resume timer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
