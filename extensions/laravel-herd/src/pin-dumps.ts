import { showHUD } from "@raycast/api";
import { Herd } from "./utils/Herd";

export default async function main() {
  const isPinned = await Herd.Dumps.isPinned();

  const text = isPinned ? "Unpinning" : "Pinning";

  showHUD(`${text} Dumps Window`);

  if (!isPinned) {
    await Herd.Dumps.open();
  }

  await Herd.Dumps.togglePin();
}
