import { Clipboard, getSelectedText } from "@raycast/api";

export type Source = "argument" | "selection" | "clipboard" | "none";

/** The text to work on: the command argument, else the selected text, else the clipboard */
export async function readInput(arg?: string): Promise<{ text: string; source: Source }> {
  if (arg) return { text: arg, source: "argument" };
  try {
    const text = await getSelectedText();
    if (text) return { text, source: "selection" };
  } catch {
    // no selection, or the front app does not share it
  }
  const text = (await Clipboard.readText()) ?? "";
  return text ? { text, source: "clipboard" } : { text: "", source: "none" };
}

export const SOURCE_LABEL: Record<Source, string> = {
  argument: "Typed text",
  selection: "Selected text",
  clipboard: "Clipboard",
  none: "Nothing",
};

export const fmt = (n: number) => n.toLocaleString("en-US");
