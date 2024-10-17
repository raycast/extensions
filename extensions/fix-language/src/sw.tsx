import { Clipboard, getSelectedText } from "@raycast/api";
import { switchLanguage } from "./common";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    if (selectedText.length > 1) {
      const mappedSelectedText = switchLanguage(selectedText);
      Clipboard.paste(mappedSelectedText);
    }
  } catch (error) {
    return;
  }
}
