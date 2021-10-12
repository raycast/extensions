import { showHUD, copyTextToClipboard } from "@raycast/api";

export default async () => {
  const now = new Date();
  await copyTextToClipboard(now.toLocaleDateString());
  await showHUD("Copied date to clipboard");
};
