import { Clipboard, showHUD } from "@raycast/api";

const zeroWidthSpace = "\u2060";

export default async function main() {
  await Clipboard.copy(zeroWidthSpace);
  await showHUD("Copied to clipboard!");
}
