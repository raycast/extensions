import { showHUD, showToast, Toast } from "@raycast/api";
import { getStatusWithPid, pauseSync } from "./lib/icloud";

export default async function Command() {
  try {
    const { status, pid } = await getStatusWithPid();
    if (status === "paused") {
      await showHUD("iCloud sync already paused");
      return;
    }
    await pauseSync(pid);
    await showHUD("iCloud sync paused");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to pause iCloud sync",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
