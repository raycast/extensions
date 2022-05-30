import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  const now = new Date();
  let timestamp = now.toLocaleString();
  timestamp = timestamp.replace(",", " |");

  await Clipboard.copy(timestamp);
  await Clipboard.paste(timestamp);
  await showHUD(timestamp);
}
