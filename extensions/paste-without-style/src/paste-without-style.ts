import { showHUD, Clipboard } from "@raycast/api";
import { isEmpty, trim } from "./utils";

export default async function PasteWithoutStyle() {
  const text = await Clipboard.readText(); // read as plain text
  if (isEmpty(text)) {
    await showHUD("No text in Clipboard");
  } else {
    await Clipboard.paste(trim(text)); // paste without newlines and formatting
    await showHUD("Pasted without Style");
  }
}
