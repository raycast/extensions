import { Toast, showToast } from "@raycast/api";
import { toggleDesktopWidgets } from "./airbuddy";
import { showFailure } from "./feedback";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Desktop Widgets…" });

  try {
    // AirBuddy exposes no readable property for widget visibility anywhere in the sdef — same
    // shape as Audio Input Lock, and for the same reason the toast can't claim a direction:
    // widgets could be toggled from AirBuddy's own UI between calls, desyncing any local guess.
    await toggleDesktopWidgets();

    toast.style = Toast.Style.Success;
    toast.title = "Desktop Widgets Toggled";
    toast.message = "Check your desktop to confirm the current state.";
  } catch (error) {
    await showFailure("Couldn't toggle Desktop Widgets", error);
  }
}
