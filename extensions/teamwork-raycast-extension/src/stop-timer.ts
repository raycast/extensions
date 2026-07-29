import { showHUD } from "@raycast/api";
import { completeTimer, formatElapsed, getRunningTimer } from "./teamwork";

export default async function Command() {
  try {
    const timer = await getRunningTimer();
    if (!timer) {
      await showHUD("No Teamwork timer found");
      return;
    }
    await completeTimer(timer);
    await showHUD(
      `Logged ${formatElapsed(timer)}: ${timer.taskName ?? "Teamwork timer"}`,
    );
  } catch (error) {
    await showHUD(
      `Could not stop timer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
