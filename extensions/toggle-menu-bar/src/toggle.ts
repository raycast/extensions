import { closeMainWindow, environment, getPreferenceValues, LaunchType, showToast, Toast } from "@raycast/api";
import {
  failureMessage,
  refreshStatusSubtitle,
  toggleMenuBarModes,
  updateCommandSubtitle,
  updateStatusSubtitle,
} from "./menu-bar";
import { ExtensionPreferences, togglePreferences } from "./preferences";

export default async function command() {
  if (environment.launchType === LaunchType.Background) {
    try {
      await refreshStatusSubtitle();
    } catch (error) {
      await updateCommandSubtitle("Current: Unknown");
      console.error("Couldn’t refresh menu bar status", error);
    }
    return;
  }

  try {
    const { firstMode, secondMode, closeWindow } = togglePreferences(getPreferenceValues<ExtensionPreferences>());
    const status = await toggleMenuBarModes(firstMode, secondMode);
    await updateStatusSubtitle(status.label);
    await showToast({
      style: Toast.Style.Success,
      title: "Menu bar mode updated",
      message: status.label,
    });
    if (closeWindow) await closeMainWindow();
  } catch (error) {
    await updateCommandSubtitle("Current: Unknown");
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn’t change menu bar auto-hide",
      message: failureMessage(error),
    });
  }
}
