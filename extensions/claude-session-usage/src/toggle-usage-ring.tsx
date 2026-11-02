import { showHUD } from "@raycast/api";
import { isRingHidden, redrawRing, setRingHidden } from "./lib/ring-visibility";

export default async function Command() {
  const hide = !isRingHidden();
  setRingHidden(hide);
  try {
    await redrawRing();
  } catch {
    setRingHidden(false);
    await showHUD("Run Menu Bar Ring once to turn it on");
    return;
  }
  await showHUD(hide ? "Menu bar ring hidden" : "Menu bar ring shown");
}
