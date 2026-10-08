import { Clipboard, getSelectedText } from "@raycast/api";
import { validateAndGetPreferences } from "./preferences-utils";
import { switchLanguage } from "./common";

export default async function Command() {
  const preferences = validateAndGetPreferences();
  if (!preferences) {
    return;
  }
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
