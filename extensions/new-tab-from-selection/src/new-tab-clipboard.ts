import { Clipboard, showHUD } from "@raycast/api";
import { openForText } from "./run";

export default async function main() {
  let text: string | undefined;
  try {
    text = await Clipboard.readText();
  } catch {
    await showHUD("Could not read clipboard");
    return;
  }
  // open() failures are handled inside openForText, so they won't be
  // mis-reported here as a clipboard-read failure.
  await openForText(text, "Clipboard is empty");
}
