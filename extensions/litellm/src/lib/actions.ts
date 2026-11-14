import { LaunchType, launchCommand, open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getBaseUrl } from "./litellm";

// Action handlers can throw (e.g. a disabled command, a failed open). Surface the
// failure as a toast instead of letting the click silently do nothing.

export async function openPreferences() {
  try {
    await openExtensionPreferences();
  } catch (error) {
    await showFailureToast(error, { title: "Could not open preferences" });
  }
}

export async function openDashboard() {
  try {
    await open(`${getBaseUrl()}/ui`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open dashboard" });
  }
}

export async function openUsageCommand() {
  try {
    await launchCommand({ name: "usage", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Usage" });
  }
}
