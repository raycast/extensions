import { Toast, showHUD, showToast } from "@raycast/api";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { formatReadableDuration, stopTimer as persistStopTimer } from "./lib/timer-store";

export default async function StopTimerCommand() {
  try {
    const { entry } = await persistStopTimer();
    const durationLabel = formatReadableDuration(entry.durationMs);
    await showHUD(`Stopped: ${durationLabel}`);
    await refreshMenuBarCommand();
  } catch (error) {
    const title =
      error instanceof Error && error.message === "NO_ACTIVE_TIMER"
        ? "No running timer to stop"
        : "Failed to stop timer";
    await showToast({ style: Toast.Style.Failure, title });
  }
}
