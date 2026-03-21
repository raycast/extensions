import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { buildHudText, readAndClean } from "./utils/clipboard";

export default async function main() {
  const outcome = await readAndClean();

  if (outcome.status === "empty") {
    await showHUD("Clipboard is empty");
    return;
  }

  if (outcome.status === "unchanged") {
    await showHUD("✓ Nothing to clean");
    return;
  }

  const { result } = outcome;
  await closeMainWindow();
  await Clipboard.paste(result.cleaned);
  await showHUD(buildHudText(result.reductionPercent));
}
