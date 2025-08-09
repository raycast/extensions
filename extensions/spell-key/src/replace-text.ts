import { Clipboard, closeMainWindow } from "@raycast/api";

export async function replaceText(text: string) {
  await Clipboard.copy(text);
  await closeMainWindow();
  await Clipboard.paste(text);
}
