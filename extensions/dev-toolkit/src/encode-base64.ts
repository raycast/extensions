import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const base64Encoded = Buffer.from(clipboardText).toString("base64");
    await produceOutput(base64Encoded);
  } catch (error) {
    await showError("Failed to encode to Base64: " + String(error));
  }
}
