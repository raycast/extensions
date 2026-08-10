import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { linkReplacer } from "./util/linkReplacer";

export default async function main() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      showHUD("No text in clipboard");
      return;
    }

    const replacedString = linkReplacer(text);
    if (!replacedString) return;

    await Clipboard.copy(replacedString);
    showHUD("Copied to clipboard");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(err),
    });
  }
}
