import { Clipboard, Toast, closeMainWindow, showToast, getPreferenceValues } from "@raycast/api";
import { measureScreen } from "swift:../swift/Snapline";

export default async function command() {
  await closeMainWindow();

  try {
    const preferences = await getPreferenceValues();

    const result = (await measureScreen(preferences.showCrosshair, preferences.edgeTolerance)) as unknown as
      | string
      | undefined;

    if (!result) {
      return;
    }

    if (preferences.copyToClipboard) {
      await Clipboard.copy(result);
      await showToast({
        style: Toast.Style.Success,
        title: `Measured: ${result}`,
        message: "Copied to clipboard",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: `Measured: ${result}`,
      });
    }
  } catch {
    // Swift process terminates on Escape — expected, not an error
  }
}
