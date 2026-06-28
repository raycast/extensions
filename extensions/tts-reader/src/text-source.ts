import { Clipboard, getSelectedText } from "@raycast/api";

export type TextSourceResult = { text: string; source: "selection" | "clipboard" };

export async function getSelectedTextOrClipboard(): Promise<TextSourceResult> {
  try {
    return { text: await getSelectedText(), source: "selection" };
  } catch {
    return { text: (await Clipboard.readText()) ?? "", source: "clipboard" };
  }
}
