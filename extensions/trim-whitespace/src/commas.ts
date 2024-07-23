import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const read = await Clipboard.readText();
  const textWithoutCommas = String(read?.replaceAll(",", ""));
  await Clipboard.copy(textWithoutCommas);
  await showHUD("Removed commas from item");
}
