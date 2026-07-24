import { Clipboard, getSelectedText } from "@raycast/api";

// Provider-neutral text resolution. The mimo / qwen / openai text-source
// modules re-export from here so any future provider-specific divergence is
// an explicit, deliberate edit in that one file rather than a silent inherit
// through a sibling provider's module.

export type TextSourceKind = "selection" | "clipboard" | "fallback" | "none";

export interface ResolvedText {
  text: string;
  source: TextSourceKind;
}

export async function getPreviewText(fallbackText: string, maxChars: number): Promise<string> {
  const selectedText = await getSelectedText().catch(() => "");
  const sourceText = selectedText.trim() || ((await Clipboard.readText().catch(() => "")) || "").trim();
  const text = sourceText || fallbackText;
  return Array.from(text).slice(0, maxChars).join("") || fallbackText;
}

/**
 * Resolve text from selection first, falling back to clipboard. Reports the
 * source so callers can hint the user (e.g., "Reading from clipboard…").
 */
export async function resolveReadingText(): Promise<ResolvedText> {
  const selection = (await getSelectedText().catch(() => "")).trim();
  if (selection) return { text: selection, source: "selection" };

  const clipboard = ((await Clipboard.readText().catch(() => "")) || "").trim();
  if (clipboard) return { text: clipboard, source: "clipboard" };

  return { text: "", source: "none" };
}
