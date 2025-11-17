import { closeMainWindow, PopToRootType, showToast, Toast } from "@raycast/api";
import toggl from "./api/toggl";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Stopping timer..." });

  try {
    const currentTimer = await toggl.getCurrentTimer();
    console.log("Current timer:", currentTimer);

    if (!currentTimer) {
      await showToast({
        style: Toast.Style.Success,
        title: "No timer running",
      });
    } else {
      await toggl.stopTimer(currentTimer.workspace_id, currentTimer.id);
      // await showToast({ style: Toast.Style.Success, title: "Timer stopped" });
    }

    closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop timer",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
