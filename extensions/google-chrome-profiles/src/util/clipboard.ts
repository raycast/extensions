import { runAppleScript } from "run-applescript";

export const getClipboardText = async () => {
  const clipboard = await runAppleScript("the clipboard");
  if (clipboard.length === 0) throw "Clipboard is empty";
  else return clipboard;
};
