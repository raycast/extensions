import { runAppleScript } from "run-applescript";
import { copyTextToClipboard, showHUD } from "@raycast/api";

const isEmpty = (string: string) => {
  return string.length === 0;
};

export const contents = async () => {
  const clipboard = await runAppleScript("the clipboard");
  if (isEmpty(clipboard)) throw "Clipboard is empty";
  else return clipboard;
};

export const update = async (contents: string) => {
  await copyTextToClipboard(contents);
  showHUD("Copied to clipboard");
};
