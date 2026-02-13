import { closeMainWindow, showHUD, Clipboard } from "@raycast/api";
import { pickColor } from "swift:../swift/color-picker";
import { describePickedColor } from "./lib/color-describer";
import { addToHistory } from "./lib/history";
import type { PickedColor } from "./lib/types";

export default async function Command() {
  await closeMainWindow();

  const color = (await pickColor()) as PickedColor | undefined;
  if (!color) return;

  const desc = describePickedColor(color);

  await Clipboard.copy(desc.hex);
  await addToHistory(desc);

  const warnings = desc.confusionWarnings.length > 0 ? " ⚠" : "";
  await showHUD(`${desc.basicName} — ${desc.detailedDescription} (${desc.hex})${warnings}`);
}
