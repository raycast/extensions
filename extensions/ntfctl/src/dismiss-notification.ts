import { showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "./ntfctl-utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Dismissing…",
  });
  try {
    runAppleScript("ntfctl-dismiss.applescript");
    toast.hide();
    await showHUD("🗑️ Latest notification dismissed");
  } catch (e) {
    toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to dismiss notification",
      message: String(e),
    });
  }
}
