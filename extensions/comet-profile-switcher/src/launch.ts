import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import {
  alwaysNewWindow,
  CometProfile,
  focusProfileWindow,
  getProfiles,
  isAccessibilityError,
  isCometInstalled,
  launchProfile,
} from "./comet";

/** Shared body of every "open this profile" command. */
export async function runProfileCommand(directory: string, fallbackName: string, url?: string): Promise<void> {
  if (!isCometInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Comet is not installed",
      message: "Set the Comet Application in the extension preferences.",
    });
    return;
  }
  const profiles = getProfiles();
  const profile: CometProfile = profiles.find((p) => p.directory === directory) ?? {
    directory,
    name: fallbackName,
    lastUsed: false,
    active: false,
  };
  await openProfile(profile, { url }, profiles.length);
}

export async function openProfile(
  profile: CometProfile,
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
