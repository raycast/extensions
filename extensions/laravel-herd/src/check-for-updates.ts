import { showHUD } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showHUD("Checking for updates...");
  await rescue(() => Herd.General.checkForUpdates(), "Failed to check for updates.");
}
