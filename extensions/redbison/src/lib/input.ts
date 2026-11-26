import { Clipboard, getSelectedText } from "@raycast/api";

export type InputSource = "Selected Text" | "Clipboard" | "Example" | "Form" | "None";

export type Input = { text: string; source: InputSource };

/**
 * The text a utility works on: the selection in the frontmost app, or the
 * clipboard when nothing is selected. getSelectedText throws when there is no
 * selection or the app does not expose one, which is the ordinary case and
 * not an error worth showing.
 */
export async function readInput(): Promise<Input> {
  try {
    const selected = await getSelectedText();
    if (selected) return { text: selected, source: "Selected Text" };
  } catch {
    // nothing selected, or no permission to read it: fall back to the clipboard
  }
  try {
    const copied = await Clipboard.readText();
    if (copied) return { text: copied, source: "Clipboard" };
  } catch {
    // an empty or non-text clipboard
  }
  return { text: "", source: "None" };
}
