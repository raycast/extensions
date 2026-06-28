import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const now = new Date();
  await Clipboard.copy(now.toLocaleDateString());
  await showHUD("Copied date to clipboard");
}
