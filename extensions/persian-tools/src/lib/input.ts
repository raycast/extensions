import { Clipboard, getSelectedText } from "@raycast/api";

export type InputSource = "argument" | "selection" | "clipboard" | "none";

export interface ResolvedInput {
  text: string;
  source: InputSource;
}

export async function resolveInput(arg?: string): Promise<ResolvedInput> {
  if (arg && arg.trim().length > 0) {
    return { text: arg, source: "argument" };
  }

  try {
    const selected = await getSelectedText();
    if (selected && selected.trim().length > 0) {
      return { text: selected, source: "selection" };
    }
  } catch {
    // getSelectedText throws when nothing is selected
  }

  try {
    const clipboard = await Clipboard.readText();
    if (clipboard && clipboard.trim().length > 0) {
      return { text: clipboard, source: "clipboard" };
    }
  } catch {
    // Ignore clipboard read errors
  }

  return { text: "", source: "none" };
}

export const SOURCE_LABELS: Record<InputSource, string> = {
  argument: "Argument",
  selection: "Selection",
  clipboard: "Clipboard",
  none: "",
};
