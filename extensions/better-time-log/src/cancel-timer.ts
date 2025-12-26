import { Toast, showToast } from "@raycast/api";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { cancelActiveTimer, getActiveTimer } from "./lib/timer-store";

export default async function CancelTimerCommand() {
  const timer = await getActiveTimer();
  if (!timer) {
    await showToast({ style: Toast.Style.Failure, title: "No running timer to cancel" });
    return;
  }

  await cancelActiveTimer();
  await refreshMenuBarCommand();
  await showToast({ style: Toast.Style.Success, title: "Timer cancelled", message: "Not logged" });
}
