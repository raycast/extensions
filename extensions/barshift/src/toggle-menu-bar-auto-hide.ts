import {
  environment,
  getPreferenceValues,
  LaunchType,
  openCommandPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import {
  failureMessage,
  MenuBarMode,
  refreshStatusSubtitle,
  toggleMenuBarModes,
  updateStatusSubtitle,
} from "./menu-bar";

interface Preferences {
  firstMode: MenuBarMode;
  secondMode: MenuBarMode;
}

export default async function command() {
  if (environment.launchType === LaunchType.Background) {
    try {
      await refreshStatusSubtitle();
    } catch (error) {
      console.error("Couldn’t refresh menu bar status", error);
    }
    return;
  }

  const { firstMode, secondMode } = getPreferenceValues<Preferences>();

  if (firstMode === secondMode) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Choose two different modes",
      message:
        "Change First Mode or Second Mode in this command's preferences.",
      primaryAction: {
        title: "Open Command Preferences",
        onAction: openCommandPreferences,
      },
    });
    return;
  }

  try {
    const status = await toggleMenuBarModes(firstMode, secondMode);
    await updateStatusSubtitle(status.label);
    await showHUD(status.message);
  } catch (error) {
    const message = failureMessage(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn’t change menu bar auto-hide",
      message,
    });
  }
}
