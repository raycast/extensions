import { showHUD, showToast, Toast } from "@raycast/api";
import { getStatusWithPid, resumeSync } from "./lib/icloud";

export default async function Command() {
  try {
    const { status, pid } = await getStatusWithPid();
    if (status === "running") {
      await showHUD("iCloud sync already running");
      return;
    }
    await resumeSync(pid);
    await showHUD("iCloud sync resumed");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to resume iCloud sync",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
