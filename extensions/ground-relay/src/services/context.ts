import { Clipboard, getSelectedText } from "@raycast/api";

export interface CapturedContext {
  text: string;
  source: "selection" | "clipboard" | "none";
}

export async function captureOperatingContext(): Promise<CapturedContext> {
  try {
    const selection = await getSelectedText();
    if (selection.trim())
      return { text: selection.trim(), source: "selection" };
  } catch {
    // No selection is a normal local condition; continue to the clipboard lane.
  }

  const clipboard = await Clipboard.readText();
  if (clipboard?.trim()) return { text: clipboard.trim(), source: "clipboard" };
  return { text: "", source: "none" };
}
