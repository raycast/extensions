import { Clipboard, showHUD } from "@raycast/api";
import { isEmpty } from "./utils";

export default async () => {
  const text = await Clipboard.readText();
  if (isEmpty(text)) {
    await showHUD("No text in clipboard");
  } else {
    const textWithoutFormat = String(text);
    await Clipboard.paste(textWithoutFormat);
    await showHUD("Paste as Plain Text");
  }
};
