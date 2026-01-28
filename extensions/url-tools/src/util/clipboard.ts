import { showHUD, Clipboard } from "@raycast/api";

const isEmpty = (string: string) => {
  return string.length === 0;
};

export const contents = async () => {
  const clipboard = (await Clipboard.readText()) || "";
  if (isEmpty(clipboard)) throw "Clipboard is empty";
  else return clipboard;
};

export const update = async (contents: string) => {
  await Clipboard.copy(contents);
  await showHUD("Copied to clipboard");
};
