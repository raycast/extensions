import { showHUD } from "@raycast/api";
import { reloadSpaceLabels } from "./utils";

export default async function Command() {
  try {
    await reloadSpaceLabels();
    await showHUD("Labels reloaded");
  } catch {
    // Error handled by utils
  }
}
