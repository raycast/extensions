import { showHUD, Clipboard } from "@raycast/api";

export default async function main() {
  await Clipboard.clear();
  await showHUD("Cleared clipboard 🤫");
}
