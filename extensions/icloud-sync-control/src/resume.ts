import { showHUD, showToast, Toast } from "@raycast/api";
import { getStatus, resumeSync } from "./lib/icloud";

export default async function Command() {
  try {
    if ((await getStatus()) === "running") {
      await showHUD("iCloud sync already running");
      return;
    }
    await resumeSync();
    await showHUD("iCloud sync resumed");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to resume iCloud sync",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
