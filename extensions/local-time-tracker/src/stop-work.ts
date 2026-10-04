import { Toast, showHUD, showToast } from "@raycast/api";
import { formatDuration } from "./lib/duration";
import { showFailure } from "./lib/errors";
import { stopTimer } from "./lib/timer";

export default async function StopWorkCommand() {
  try {
    const result = await stopTimer();
    if (result.status === "none") {
      await showHUD("No active timer");
      return;
    }
    if (result.status === "clock-rollback") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clock changed",
        message: "The timer is still running. Correct your Mac clock, then stop it again.",
      });
      return;
    }

    await showHUD(`Stopped: ${formatDuration(result.durationSeconds)}`);
  } catch (error) {
    await showFailure("Failed to stop timer", error);
  }
}
