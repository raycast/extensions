import { getPreferenceValues, showHUD } from "@raycast/api";
import { toggleAngleMode } from "./angle-mode";
import { readAngleMode, writeAngleMode } from "./angle-mode-storage";

export default async function Command() {
  const preference = getPreferenceValues<Preferences.ToggleDegreeRadianMode>().angleMode ?? "radians";
  const currentMode = await readAngleMode(preference);
  const nextMode = toggleAngleMode(currentMode);

  await writeAngleMode(nextMode, preference);
  await showHUD(`Angle mode: ${nextMode === "degrees" ? "Degrees" : "Radians"}`);
}
