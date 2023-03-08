import { getSelectedText, showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { regexList } from "./assets/regexList";

export default async function main() {
  try {
    const text = await getSelectedText();

    if (!text) {
      showHUD("Please select a text and run the command again");
      return;
    }

    let newString = text;

    for (const item of regexList) {
      newString = newString.replace(item.test, item.replace);
    }

    if (text === newString) {
      showHUD("No text to transform");
      return;
    }

    await Clipboard.copy(newString);
    showHUD("Copied to clipboard");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(err),
    });
  }
}
