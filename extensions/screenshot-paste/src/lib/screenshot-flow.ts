import { PopToRootType, showHUD } from "@raycast/api";
import {
  CAPTURE_DIRECTORY,
  captureScreen,
  captureTimestamp,
  prepareCaptureDirectory,
  saveCapture,
  SCREEN_RECORDING_ERROR,
  screenshotFilePath,
} from "./capture";
import { pasteScreenshot, removeAfterPaste } from "./paste";
import { ScreenshotPreferences, wait } from "./preferences";
import { Screen } from "./screens";

export function screenshotFlowErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : SCREEN_RECORDING_ERROR;
}

export async function captureAndPaste(screen: Screen, preferences: ScreenshotPreferences): Promise<void> {
  await showHUD("📸 Capturing screen…", { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  await wait(preferences.captureDelayMs);
  await prepareCaptureDirectory();

  const file = screenshotFilePath(CAPTURE_DIRECTORY, captureTimestamp());
  await captureScreen(screen, file);
  const pastedFile =
    preferences.afterPaste === "save" ? await saveCapture(file, preferences.screenshotDirectory) : file;
  await pasteScreenshot(pastedFile, preferences.pasteMode);
  await removeAfterPaste(pastedFile, preferences.pasteMode, preferences.afterPaste);
  await showHUD("✅ Screenshot pasted");
}
