import { Clipboard, showHUD } from "@raycast/api";

export async function pasteOrCopy(text: string, pastedMessage: string) {
  try {
    await Clipboard.paste(text);
    await Clipboard.copy(text);
    await showHUD(pastedMessage);
  } catch {
    await Clipboard.copy(text);
    await showHUD("Couldn't paste; copied to Clipboard");
  }
}
