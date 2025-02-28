import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const parsedJson = JSON.parse(clipboardText);
    const formattedJson = JSON.stringify(parsedJson, null, 2);
    await produceOutput(formattedJson);
  } catch (error) {
    await showError("Invalid JSON: " + (error instanceof Error ? error.message : String(error)));
  }
}
