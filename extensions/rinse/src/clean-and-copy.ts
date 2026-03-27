import { Clipboard, showHUD } from "@raycast/api";
import { HUD_EMPTY, HUD_UNCHANGED, buildHudText, readAndClean } from "./utils/clipboard";

export default async function main() {
  const outcome = await readAndClean();

  if (outcome.status === "empty") {
    await showHUD(HUD_EMPTY);
    return;
  }

  if (outcome.status === "unchanged") {
    await showHUD(HUD_UNCHANGED);
    return;
  }

  const { result } = outcome;
  await Clipboard.copy(result.cleaned);
  await showHUD(buildHudText(result.reductionPercent));
}
