import { getSelectedText, showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { linkReplacer } from "./util/linkReplacer";

export default async function main() {
  try {
    const text = await getSelectedText();

    if (!text) {
      showHUD("Please select a text and run the command again");
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
