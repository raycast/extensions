import { closeMainWindow, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { LayoutManager } from "./model/LayoutManager";
import { getWindowsForegroundProcessId } from "./model/win32";

export default async function main() {
  const { closeRaycast } = getPreferenceValues<{ closeRaycast: boolean }>();

  try {
    const isWindows = process.platform === "win32";
    const foregroundPid = closeRaycast && isWindows ? await getWindowsForegroundProcessId() : 0;

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
