import { Clipboard, showHUD } from "@raycast/api";

export async function pasteOrCopy(text: string, pastedMessage: string) {
  let didPaste = true;

  try {
    await Clipboard.paste(text);
  } catch {
    didPaste = false;
  }

  await Clipboard.copy(text);
  await showHUD(didPaste ? pastedMessage : "Couldn't paste; copied to Clipboard");
}
