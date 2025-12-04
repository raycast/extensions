import { Clipboard, closeMainWindow } from "@raycast/api";
import { recognizeText, showSuccessToast, showFailureToast } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const recognizedText = await recognizeText();

    if (!recognizedText) {
      await showFailureToast("No text detected");
      return;
    }

    await Clipboard.copy(recognizedText);
    await showSuccessToast("Copied text to clipboard");
  } catch (e) {
    console.error(e);
    await showFailureToast("Failed detecting text");
  }
}
