import { showHUD, Clipboard } from "@raycast/api";

export const contents = async () => {
  const clipboard = await Clipboard.readText();
  if (!clipboard) throw "Clipboard is empty";
  else return clipboard;
};

export const update = async (contents: string) => {
  await Clipboard.copy(contents);
  showHUD("Copied to clipboard");
};
