import { Clipboard, showHUD } from "@raycast/api";

export const update = async (contents: string) => {
  await Clipboard.copy(contents);
  showHUD("Copied to clipboard");
};
