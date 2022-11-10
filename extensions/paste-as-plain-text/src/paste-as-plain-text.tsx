import { Clipboard, showHUD } from "@raycast/api";
import { isEmpty } from "./utils";

export default async () => {
  const clipboardText = await Clipboard.readText();
  if (isEmpty(clipboardText)) {
    await showHUD("No text in clipboard");
  } else {
    await Clipboard.paste(clipboardText + "");
    await showHUD("Paste as Plain Text");
  }
};
