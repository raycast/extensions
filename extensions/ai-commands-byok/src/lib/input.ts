import { Clipboard, getSelectedText } from "@raycast/api";

export type InputSource = "selection" | "clipboard";

export interface Input {
  text: string;
  source: InputSource;
  /** Why the selection could not be read, when it fell back to the clipboard. */
  reason?: string;
}

/**
 * Selected text first, like Raycast AI did. Clipboard as a visible fallback,
 * because some apps (mostly Electron ones) do not expose their selection.
 */
export async function readInput(): Promise<Input> {
  let reason = "Nothing is selected";
  try {
    const selected = await getSelectedText();
    if (selected.trim()) return { text: selected, source: "selection" };
  } catch (e) {
    reason = e instanceof Error ? e.message : String(e);
  }
  const clip = await Clipboard.readText();
  if (clip?.trim()) return { text: clip, source: "clipboard", reason };
  throw new Error(`${reason}, and the clipboard is empty. Select or copy some text, then run the command again.`);
}
