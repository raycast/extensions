import { Toast, showToast } from "@raycast/api";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { pauseActiveTimer } from "./lib/timer-store";

export default async function PauseTimerCommand() {
  try {
    await pauseActiveTimer();
    await refreshMenuBarCommand();
    await showToast({ style: Toast.Style.Success, title: "Timer paused" });
  } catch (error) {
    const title =
      error instanceof Error && error.message === "ALREADY_PAUSED"
        ? "Timer is already paused"
        : "No running timer to pause";
    await showToast({ style: Toast.Style.Failure, title });
  }
}
