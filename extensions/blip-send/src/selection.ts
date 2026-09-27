import { getSelectedFinderItems } from "@raycast/api";
import { isWindows, runPowerShellAsset } from "./platform";

/**
 * What is selected in the system file manager right now.
 *
 * Raycast has no Windows counterpart to getSelectedFinderItems, so on Windows the
 * selection is read from the frontmost File Explorer window instead. Either form
 * rejects when the selection cannot be read, and the caller decides what to say.
 */
export async function selectedFiles(): Promise<string[]> {
  if (!isWindows) {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path.replace(/\/$/, ""));
  }
  const output = await runPowerShellAsset("explorer-selection.ps1", []);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
