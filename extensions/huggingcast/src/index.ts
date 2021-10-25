import { showHUD, copyTextToClipboard } from "@raycast/api";

export default async function main() {
  const now = new Date();
  await copyTextToClipboard(now.toLocaleDateString());
  await showHUD("Copied date to clipboard");
};
