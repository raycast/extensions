import { showHUD, showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { getActiveTimesheet, stopTimesheet } from "./libs/api";

export default async function Command() {
  try {
    const activeTimesheet = await getActiveTimesheet();
    if (!activeTimesheet) {
      await showHUD("No active timer found");
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Stopping timer..." });
    await stopTimesheet(activeTimesheet.id);
    await showHUD("Timer stopped!");

    try {
      await launchCommand({ name: "logged-hours", type: LaunchType.Background });
    } catch (e) {
      // ignore
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop timer",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
