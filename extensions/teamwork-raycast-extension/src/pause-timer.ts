import { showHUD } from "@raycast/api";
import { getRunningTimer, pauseTimer } from "./teamwork";

export default async function Command() {
  try {
    const timer = await getRunningTimer();
    if (!timer) {
      await showHUD("No Teamwork timer found");
      return;
    }
    if (!timer.running) {
      await showHUD("Timer is already paused");
      return;
    }
    await pauseTimer(timer.id);
    await showHUD(`Paused: ${timer.taskName ?? "Teamwork timer"}`);
  } catch (error) {
    await showHUD(
      `Could not pause timer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
