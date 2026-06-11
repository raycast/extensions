import { Clipboard, getSelectedText } from "@raycast/api";

export type TextSourceKind = "selection" | "clipboard";

export interface ReadableText {
  text: string;
  source: TextSourceKind;
}

export async function getReadableText(): Promise<ReadableText | null> {
  const selectedText = await getSelectedText().catch(() => "");
  const trimmedSelection = selectedText.trim();
  if (trimmedSelection) {
    return { text: trimmedSelection, source: "selection" };
  }

  const clipboardText = (await Clipboard.readText().catch(() => "")) || "";
  const trimmedClipboard = clipboardText.trim();
  if (trimmedClipboard) {
    return { text: trimmedClipboard, source: "clipboard" };
  }

  return null;
}

export function formatTextSource(source: TextSourceKind): string {
  return source === "selection" ? "selection" : "clipboard";
}
