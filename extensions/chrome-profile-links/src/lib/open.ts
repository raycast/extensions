import { closeMainWindow, PopToRootType, showToast, Toast } from "@raycast/api";
import { openInChromeProfile } from "./chrome";

/**
 * Opens the URL in the given profile and closes Raycast.
 * `onOpened` runs only after Chrome accepted the URL, and before the window closes.
 */
export async function openLink(
  url: string,
  profileDirectory: string,
  onOpened?: () => void | Promise<void>,
): Promise<boolean> {
  try {
    await openInChromeProfile(url, profileDirectory);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Google Chrome",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
  await onOpened?.();
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  return true;
}
