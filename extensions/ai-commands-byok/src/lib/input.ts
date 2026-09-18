import { Alert, Clipboard, confirmAlert, getSelectedText, Icon } from "@raycast/api";

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
  if (!clip?.trim()) {
    throw new Error(`${reason}, and the clipboard is empty. Select or copy some text, then run the command again.`);
  }
  // The clipboard may hold a password or something unrelated. Nothing is sent
  // anywhere until the user has seen a preview and said yes.
  const ok = await confirmAlert({
    title: "No selection found. Use the clipboard instead?",
    message: `${reason}.\n\nClipboard: “${preview(clip)}”`,
    icon: Icon.Clipboard,
    primaryAction: { title: "Use Clipboard Text", style: Alert.ActionStyle.Default },
    dismissAction: { title: "Cancel" },
  });
  if (!ok) throw new Error("Cancelled. Select some text and run the command again.");
  return { text: clip, source: "clipboard", reason };
}

function preview(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 120 ? `${flat.slice(0, 117)}…` : flat;
}
