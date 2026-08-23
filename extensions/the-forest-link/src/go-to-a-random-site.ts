import { open, showHUD } from "@raycast/api";

import { recordWalk } from "./walk-history";
import { WALK_URL, resolveWalkDestination } from "./the-forest";

export default async function Command() {
  let destination: string;

  try {
    destination = await resolveWalkDestination();
  } catch {
    await showHUD("Opened walk, but couldn't resolve it for history");
    await open(WALK_URL);
    return;
  }

  try {
    const savedEntry = await recordWalk(destination);
    if (!savedEntry) await showHUD("Walk opened but wasn't saved because history was cleared");
  } catch {
    await showHUD("Walk opened, but couldn't save it to history");
  }

  await open(destination);
}
