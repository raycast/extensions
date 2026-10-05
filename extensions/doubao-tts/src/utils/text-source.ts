import { Clipboard, getSelectedText } from "@raycast/api";

export async function getPreviewText(fallbackText: string, maxChars: number): Promise<string> {
  const selectedText = await getSelectedText().catch(() => "");
  const sourceText = selectedText.trim() || ((await Clipboard.readText().catch(() => "")) || "").trim();
  const text = sourceText || fallbackText;
  return Array.from(text).slice(0, maxChars).join("") || fallbackText;
}
