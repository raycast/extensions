import { showHUD, showToast, Toast } from "@raycast/api";
import { start } from "./lib";

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting keep-awake…",
    });
    const result = await start();
    await showHUD(result.alreadyOn ? "Already on ☕" : "Keep awake ON ☕");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // User cancelled admin dialog
    if (/User canceled|cancelled|-128/i.test(msg)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cancelled",
        message: "Admin password required",
      });
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start",
      message: msg,
    });
  }
}
