import { closeMainWindow, PopToRootType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    await showFailureToast(error, { title: "Failed to open Google Chrome" });
    return false;
  }
  try {
    await onOpened?.();
  } catch {
    // The link is already open in Chrome: a failed frecency update must not keep Raycast open.
  }
  await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  return true;
}
