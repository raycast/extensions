import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import { camelCase } from "change-case";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;
    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }
    const converted = camelCase(clipboardText);
    await produceOutput(converted);
  } catch (error) {
    await showError("Failed to convert to camelCase: " + String(error));
  }
}
