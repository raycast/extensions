import { showHUD } from "@raycast/api";
import { getRunningTimer, resumeTimer } from "./teamwork";

export default async function Command() {
  try {
    const timer = await getRunningTimer();
    if (!timer) {
      await showHUD("No Teamwork timer found");
      return;
    }
    if (timer.running) {
      await showHUD("Timer is already running");
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
