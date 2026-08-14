import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showCameraPreview } from "swift:../swift";
import { getDefaultCameraId } from "./storage";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences.PreviewCamera>();
  const cameraId = await getDefaultCameraId();

  // The preview is a separate window, so get Raycast out of the way first.
  await closeMainWindow();

  try {
    await showCameraPreview(
      preferences.mirror,
      preferences.fill,
      cameraId,
      preferences.cameraType,
      preferences.windowSize,
    );
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : "Could not open the camera preview");
  }
}
