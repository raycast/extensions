import { closeMainWindow, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { LayoutManager } from "./model/LayoutManager";
import { getWindowsRaycastPid } from "./model/win32";

export default async function main() {
  const { closeRaycast } = getPreferenceValues<Preferences.Toggle>();

  try {
    const isWindows = process.platform === "win32";
    // raycast_foreground_pid only reports a PID while the Raycast window itself
    // is in front, so the 2s foreground-change wait never stalls on the app the
    // user was typing in when the hotkey fired with Raycast hidden.
    const foregroundPid = closeRaycast && isWindows ? await getWindowsRaycastPid() : 0;

    if (closeRaycast && isWindows) {
      await closeMainWindow();
    }

    const selectedInput = await LayoutManager.setNextInput(foregroundPid);

    if (closeRaycast && !isWindows) {
      await closeMainWindow();
    }

    if (closeRaycast) {
      await showHUD(`⌨️ Activated '${selectedInput.title}' Layout`);
    } else {
      await showToast({ title: `⌨️ Activated '${selectedInput.title}' Layout` });
    }
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't switch keyboard layout" });
  }
}
