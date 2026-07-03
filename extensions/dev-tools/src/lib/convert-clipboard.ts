import { Clipboard, showHUD } from "@raycast/api";
import { type Base, LABEL, format, parse } from "./number-base";

/**
 * Shared body for the no-view clipboard shortcut commands: read the clipboard,
 * parse it as `from`, convert to `to`, write the result back, and report via HUD.
 */
export async function convertClipboard(from: Base, to: Base): Promise<void> {
  const clipboard = (await Clipboard.readText())?.trim();
  if (!clipboard) {
    await showHUD("❌ Clipboard is empty");
    return;
  }
  try {
    const result = format(parse(clipboard, from), to);
    await Clipboard.copy(result);
    await showHUD(`${clipboard} → ${result}  (${LABEL[from]} → ${LABEL[to]})`);
  } catch (error) {
    await showHUD(`❌ ${error instanceof Error ? error.message : String(error)}`);
  }
}
