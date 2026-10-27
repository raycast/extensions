import { launchCommand, LaunchType } from "@raycast/api";
import { showErrorHUD } from "./lib/errors";
import { readInput, restoreClipboard } from "./lib/quick";

/**
 * Translate Selection: opens the translator with the selected text, or empty when nothing is
 * selected. It runs without a window so the selection is read while the user's app is still in
 * front, the same way the in-place commands read it.
 */
export default async function Command() {
  const input = await readInput(false).catch(() => undefined);
  if (input) await restoreClipboard(input, input.text, false);
  try {
    await launchCommand({ name: "translator", type: LaunchType.UserInitiated, context: { text: input?.text ?? "" } });
  } catch (error) {
    await showErrorHUD(error);
  }
}
