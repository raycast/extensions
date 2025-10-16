import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { recognizeText } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const recognizedText = await recognizeText();

    if (!recognizedText) {
      return await showToast({
        style: Toast.Style.Failure,
        title: "No text detected",
      });
    }

    await Clipboard.copy(recognizedText);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied text to clipboard",
    });
  } catch (e) {
    console.error(e);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed detecting text",
    });
  }
}
