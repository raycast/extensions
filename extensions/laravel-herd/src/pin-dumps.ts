import { closeMainWindow, showHUD } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  const isPinned = await rescue(async () => Herd.Dumps.isPinned(), "Failed to check if Dumps is pinned.", false);

  const text = isPinned ? "Unpinning" : "Pinning";

  showHUD(`${text} Dumps Window`);

  if (!isPinned) {
    await rescue(async () => Herd.Dumps.open(), "Failed to open Dumps.");
    await closeMainWindow();
  }

  await rescue(async () => Herd.Dumps.togglePin(), "Failed to toggle pin.");
}
