import { Clipboard, getSelectedText } from "@raycast/api";
import { setTimeout as delay } from "node:timers/promises";

// Some apps finish copying their selection after getSelectedText resolves.
// A result matching the pre-capture clipboard is therefore ambiguous. Give
// the selection API time to catch up before accepting it. Identical text is
// still a valid selection, so retries must be bounded.
export async function readSelection(): Promise<string> {
  const previousClipboard = await Clipboard.readText().catch(() => undefined);
  let selection = await getSelectedText();
  for (
    let attempt = 0;
    attempt < 4 && selection === previousClipboard;
    attempt++
  ) {
    await delay(150);
    selection = await getSelectedText();
  }
  // Never use clipboard contents as a fallback for an unsupported selection.
  return selection;
}
