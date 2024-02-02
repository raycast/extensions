import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  await Clipboard.paste("¯\\_(ツ)_/¯");
  await showHUD("¯\\_(ツ)_/¯");
}
