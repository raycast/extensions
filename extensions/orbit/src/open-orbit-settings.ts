import { Toast, open, showToast } from "@raycast/api";
import { buildOrbitSettingsUrl } from "./lib/orbit";

/**
 * Opens the Orbit Settings screen via the `orbit://settings` deep link.
 * Shows a success or failure toast so the user knows whether the app
 * responded — useful when Orbit is not running and takes a moment to launch.
 */
export default async function Command() {
  try {
    await open(buildOrbitSettingsUrl());
    await showToast({
      style: Toast.Style.Success,
      title: "Opened Settings",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Settings",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
