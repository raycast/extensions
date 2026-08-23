import { open, showHUD } from "@raycast/api";

import { recordWalk } from "./walk-history";
import { WALK_URL, resolveWalkDestination } from "./the-forest";

export default async function Command() {
  try {
    const destination = await resolveWalkDestination();
    await recordWalk(destination);
    await open(destination);
  } catch {
    await showHUD("Opened walk, but couldn't save it to history");
    await open(WALK_URL);
  }
}
