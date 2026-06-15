import { showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "./ntfctl-utils";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Clearing notifications…",
  });
  try {
    runAppleScript("ntfctl-clear.applescript");
    toast.hide();
    await showHUD("🧹 All notifications cleared");
  } catch (e) {
    toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to clear notifications",
      message: String(e),
    });
  }
}
