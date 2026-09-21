import { LaunchType, LocalStorage, Toast, launchCommand, openExtensionPreferences, showToast } from "@raycast/api";

const KEY = "menu-bar-onboarding-attempted";

/** One initial launch; never undo a user's later decision to hide the menu. */
export async function startMenuBarOnce(): Promise<void> {
  if (await LocalStorage.getItem(KEY)) return;
  await LocalStorage.setItem(KEY, true);
  try {
    await launchCommand({ name: "actionablePullRequests", type: LaunchType.UserInitiated });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Enable My Pull Requests in Raycast Settings",
      message: "Raycast could not start the menu-bar command. If it is disabled, enable it in settings.",
      primaryAction: { title: "Open Settings", onAction: openExtensionPreferences },
    });
  }
}
