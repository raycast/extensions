import { showHUD, showToast, Toast } from "@raycast/api";
import { stop } from "./lib";

export default async function Command() {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Restoring sleep…" });
    await stop();
    await showHUD("Keep awake OFF 💤");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
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
      title: "Failed to stop",
      message: msg,
    });
  }
}
