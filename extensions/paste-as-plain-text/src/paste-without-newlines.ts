import { showHUD, Clipboard } from "@raycast/api";
import { isEmpty, trim } from "./utils";

export default async () => {
  const text = await Clipboard.readText();
  if (isEmpty(text)) {
    await showHUD("No text in Clipboard");
  } else {
    await Clipboard.paste(trim(text));
    await showHUD("Pasted without newlines");
  }
};
