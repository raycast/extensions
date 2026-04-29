import { getSelectedText, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { telexTransform } from "./telex";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();

    if (!selectedText.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "No text selected" });
      return;
    }

    const result = telexTransform(selectedText);

    await Clipboard.paste(result);
    await Clipboard.copy(result);

    await showHUD("Copied to clipboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}
