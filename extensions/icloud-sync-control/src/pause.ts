import { showHUD, showToast, Toast } from "@raycast/api";
import { getStatus, pauseSync } from "./lib/icloud";

export default async function Command() {
  try {
    if ((await getStatus()) === "paused") {
      await showHUD("iCloud sync already paused");
      return;
    }
    await pauseSync();
    await showHUD("iCloud sync paused");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to pause iCloud sync",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
