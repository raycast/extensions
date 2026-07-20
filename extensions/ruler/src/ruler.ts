import { Clipboard, Toast, closeMainWindow, showToast, getPreferenceValues } from "@raycast/api";

const isMac = process.platform === "darwin";

export default async function command() {
  await closeMainWindow();

  try {
    const preferences = getPreferenceValues<Preferences>();

    let measureDistance: (dragMode: boolean) => Promise<string | null | undefined>;
    if (isMac) {
      const { measureDistance: measureDistanceSwift } = await import("swift:../swift/Ruler");
      measureDistance = measureDistanceSwift as unknown as (dragMode: boolean) => Promise<string | null | undefined>;
    } else {
      const { measure_distance: measureDistanceRust } = await import("rust:../rust/ruler");
      measureDistance = measureDistanceRust;
    }

    const distance = await measureDistance(preferences.dragMode);

    if (!distance) {
      return;
    }

    let message = `Distance: ${distance} pixels`;

    if (preferences.copyToClipboard) {
      message = `Distance of ${distance} pixels successfully copied to clipboard`;
      await Clipboard.copy(distance);
    }
    await showToast({ style: Toast.Style.Success, title: message });
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to measure distance" });
  }
}
