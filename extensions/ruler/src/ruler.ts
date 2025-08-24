import { Clipboard, Toast, closeMainWindow, showToast, getPreferenceValues } from "@raycast/api";
import { measureDistance } from "swift:../swift/Ruler";

export default async function command() {
  await closeMainWindow();

  try {
    const preferences = await getPreferenceValues();

    const distance = (await measureDistance(preferences.dragMode)) as unknown as string | undefined;

    if (!distance) {
      return;
    }

    let message = `Distance: ${distance} pixels`;

    if (preferences.copyToClipboard) {
      message = `Distance of ${distance} pixels successfully copied to clipboard`;
      await Clipboard.copy(distance);
    }
    await showToast({ style: Toast.Style.Success, title: message });
  } catch (e) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to measure distance" });
  }
}
