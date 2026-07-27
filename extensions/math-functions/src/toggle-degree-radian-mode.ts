import { getPreferenceValues, showHUD } from "@raycast/api";
import { AngleMode, toggleAngleMode } from "./angle-mode";
import { readAngleMode, writeAngleMode } from "./angle-mode-storage";

type ExtensionPreferences = {
  angleMode: AngleMode;
};

export default async function Command() {
  const { angleMode: preference } = getPreferenceValues<ExtensionPreferences>();
  const currentMode = await readAngleMode(preference);
  const nextMode = toggleAngleMode(currentMode);

  await writeAngleMode(nextMode, preference);
  await showHUD(`Angle mode: ${nextMode === "degrees" ? "Degrees" : "Radians"}`);
}
