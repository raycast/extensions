import { getPreferenceValues } from "@raycast/api";
import { getRightClickMode, RightClickMode } from "./lib/trackpad";
import { setRightClick } from "./lib/quick-toggle";

export default async function Command() {
  const { toggleCorner } = getPreferenceValues<Preferences.ToggleRightClick>();
  const current = await getRightClickMode();
  const next: RightClickMode = current === "two-finger" ? toggleCorner : "two-finger";
  await setRightClick(next);
}
