import { Clipboard, closeMainWindow } from "@raycast/api";
import { exec } from "node:child_process";

export async function replaceText(text: string) {
  await Clipboard.copy(text);
  await closeMainWindow();

  exec(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
}
