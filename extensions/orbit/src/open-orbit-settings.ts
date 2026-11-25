import { Toast, showToast } from "@raycast/api";
import { openMemoryMachineUrl, showMemoryMachineError } from "./lib/installed-app";
import { buildMemoryMachineSettingsUrl } from "./lib/memory-machine";

/**
 * Opens the Memory Machine Settings screen via the `memorymachine://settings` deep link.
 * Shows a success or failure toast so the user knows whether the app
 * responded — useful when Memory Machine is not running and takes a moment to launch.
 */
export default async function Command() {
  try {
    await openMemoryMachineUrl(buildMemoryMachineSettingsUrl());
    await showToast({
      style: Toast.Style.Success,
      title: "Opened Settings",
    });
  } catch (error) {
    await showMemoryMachineError(error, "Could not open Settings", () => Command());
  }
}
