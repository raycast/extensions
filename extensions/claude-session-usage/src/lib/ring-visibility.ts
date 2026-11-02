import { Cache, launchCommand, LaunchType } from "@raycast/api";
import { MENU_BAR_COMMAND } from "./constants";

const cache = new Cache({ namespace: "menu-bar" });
const HIDDEN = "hidden";

export function isRingHidden(): boolean {
  return cache.get(HIDDEN) === "1";
}

export function setRingHidden(hidden: boolean): void {
  if (hidden) cache.set(HIDDEN, "1");
  else cache.remove(HIDDEN);
}

export async function redrawRing(): Promise<void> {
  await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background });
}
