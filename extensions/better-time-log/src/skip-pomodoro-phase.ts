import { Toast, showToast } from "@raycast/api";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { advancePomodoroPhase, getActiveTimer } from "./lib/timer-store";

export default async function SkipPomodoroPhaseCommand() {
  const timer = await getActiveTimer();
  if (!timer || timer.mode !== "pomodoro" || !timer.pomodoro) {
    await showToast({ style: Toast.Style.Failure, title: "No Pomodoro is running" });
    return;
  }

  const result = await advancePomodoroPhase(timer, { skip: true });
  await refreshMenuBarCommand();
  await showToast({
    style: Toast.Style.Success,
    title: result.message,
    message: result.subtitle,
  });
}
