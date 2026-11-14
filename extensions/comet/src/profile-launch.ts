import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import {
  alwaysNewWindow,
  CometProfileInfo,
  focusProfileWindow,
  getProfiles,
  isAccessibilityError,
  launchProfile,
} from "./profiles";

/** Opens a profile: focuses its existing window if there is one, otherwise launches Comet for it. */
export async function openProfile(
  profile: CometProfileInfo,
  options: { url?: string; newWindow?: boolean } = {},
  profileCount = getProfiles().length,
) {
  const newWindow = options.newWindow || alwaysNewWindow();

  // Reuse an existing window unless a new one was asked for. A URL is handed to Comet
  // directly: Chromium opens it as a tab in the profile's existing window on its own.
  if (!newWindow && !options.url) {
    try {
      const result = await focusProfileWindow(profile, profileCount);
      if (result === "focused") {
        await closeMainWindow({ clearRootSearch: true });
        await showHUD(`Comet · ${profile.name}`);
        return;
      }
    } catch (error) {
      if (isAccessibilityError(error)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Can't check for an existing window",
          message:
            "Give Raycast Accessibility access (System Settings → Privacy & Security) so it can focus Comet windows. Opening a new window instead.",
        });
      }
    }
  }

  await closeMainWindow({ clearRootSearch: true });
  try {
    await launchProfile(profile, { url: options.url, newWindow });
    await showHUD(`Opening Comet · ${profile.name}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Comet",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
