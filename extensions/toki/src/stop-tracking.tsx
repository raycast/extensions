import { showHUD } from "@raycast/api";
import { getTrackingStatus, stopTracking } from "./db";
import { refreshMenuBar, showErrorHUD } from "./utils";

export default async function Command() {
  try {
    const session = await getTrackingStatus();
    if (!session) {
      await showHUD("Nothing was being tracked");
      return;
    }

    await stopTracking();
    refreshMenuBar();
    await showHUD(`Stopped tracking ${session.activityTitle}`);
  } catch (error) {
    await showErrorHUD("stopping tracking", error);
  }
}
