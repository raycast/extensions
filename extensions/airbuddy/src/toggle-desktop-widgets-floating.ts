import { Toast, showToast } from "@raycast/api";
import { getAppState, toggleDesktopWidgetsFloating } from "./airbuddy";
import { showFailure } from "./feedback";
import { pollUntil } from "./poll";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Desktop Widgets Floating…" });

  try {
    // RENAMED in AirBuddy 913 (was `toggle desktop widgets` in 912, and controlled the widgets'
    // visibility). The command now toggles whether the widgets temporarily float above other
    // windows — a different setting, with a new readable counterpart (`desktopWidgetsFloating`) —
    // so the toast can report the real resulting state instead of a direction-less "Toggled".
    const before = await getAppState();
    const wasFloating = before.desktopWidgetsFloating;

    await toggleDesktopWidgetsFloating();

    const after = await pollUntil(
      () => getAppState(),
      (state) => state.desktopWidgetsFloating !== wasFloating,
      {
        description: "Desktop Widgets floating state never changed",
      },
    );

    toast.style = Toast.Style.Success;
    // Name the resulting state as On/Off, parallel to Microphone Input and Audio Input Lock. The
    // bare adjective form ("Desktop Widgets Not Floating") reads as a passive status label rather
    // than confirmation of the toggle the user just performed.
    toast.title = after.desktopWidgetsFloating ? "Desktop Widgets Floating: On" : "Desktop Widgets Floating: Off";
  } catch (error) {
    await showFailure("Couldn't toggle Desktop Widgets floating", error);
  }
}
