import { showHUD } from "@raycast/api";
import { loadState, showOverlay } from "./lib/runtime";

export default async function BreatheNow() {
  const shown = await showOverlay("manual", await loadState());
  if (!shown) await showHUD("Already breathing");
}
