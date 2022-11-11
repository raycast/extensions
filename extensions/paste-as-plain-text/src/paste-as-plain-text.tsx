import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { isEmpty, trim } from "./utils";

export default async () => {
  const preferences = getPreferenceValues<Preferences>();
  const clipboardText = await Clipboard.readText();
  if (isEmpty(clipboardText)) {
    await showHUD("No text in clipboard");
  } else {
    const text = preferences.cleanLineBreaks ? trim(clipboardText) : clipboardText + "";
    await Clipboard.paste(text);
    await showHUD("Paste as Plain Text");
  }
};
