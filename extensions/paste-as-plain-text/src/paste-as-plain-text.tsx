import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";
import { isEmpty, transform } from "./utils";

export default async () => {
  const { cleanLineBreaks: strip, trim } = getPreferenceValues<Preferences>();
  const clipboardText = await Clipboard.readText();
  if (isEmpty(clipboardText)) {
    await showHUD("No text in clipboard");
  } else {
    const transformedText = transform(clipboardText, { strip, trim });
    await Clipboard.paste(transformedText);
    await showHUD("Paste as Plain Text");
  }
};
