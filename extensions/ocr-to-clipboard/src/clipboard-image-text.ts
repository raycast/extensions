import { closeMainWindow, showHUD } from "@raycast/api";
import { recognizeTextOnClipboard } from "swift:../swift";
import { deliverToClipboard, errorMessage, ocrOptionsFromPreferences } from "./lib/ocr";

export default async function Command() {
  await closeMainWindow();

  try {
    const options = ocrOptionsFromPreferences();
    const result = await recognizeTextOnClipboard(
      options.languages,
      options.autoDetectLanguage,
      options.mergeLines,
      options.tabBetweenColumns,
    );
    await deliverToClipboard(result);
  } catch (error) {
    await showHUD(errorMessage(error));
  }
}
