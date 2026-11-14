import { showHUD, showToast, Toast } from "@raycast/api";
import { isDaemonRunning, sendSocketCommand, startDaemonIfNotRunning } from "./lib/ipc";

export default async function Command() {
  try {
    const running = await isDaemonRunning();

    if (!running) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting Dynamic Island...",
      });
      await startDaemonIfNotRunning();
      await showHUD("🏝️ Dynamic Island Started");
      return;
    }

    const res = await sendSocketCommand<{ isExpanded: boolean }>({
      action: "toggle",
    });

    if (res.isExpanded) {
      await showHUD("🏝️ Dynamic Island Expanded");
    } else {
      await showHUD("🏝️ Dynamic Island Collapsed");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle Dynamic Island",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
