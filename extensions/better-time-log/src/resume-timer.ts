import { Toast, showToast } from "@raycast/api";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { resumeActiveTimer } from "./lib/timer-store";

export default async function ResumeTimerCommand() {
  try {
    await resumeActiveTimer();
    await refreshMenuBarCommand();
    await showToast({ style: Toast.Style.Success, title: "Timer resumed" });
  } catch (error) {
    const title =
      error instanceof Error && (error.message === "NOT_PAUSED" || error.message === "NO_ACTIVE_TIMER")
        ? "No paused timer to resume"
        : "Unable to resume";
    await showToast({ style: Toast.Style.Failure, title });
  }
}
