import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const text = clipboardText;

    const lines = text.split("\n").length;

    await produceOutput(String(lines));
  } catch (error) {
    await showError("Failed to count characters: " + String(error));
  }
}
