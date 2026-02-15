import { Clipboard } from "@raycast/api";
import { MAX_CLIPBOARD_OFFSET } from "./constants";

function normalizeOffset(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  if (offset < 0) return 0;
  if (offset > MAX_CLIPBOARD_OFFSET) return MAX_CLIPBOARD_OFFSET;
  return Math.trunc(offset);
}

function isLikelyImagePlaceholderText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return /^image\s+\d+\s*(?:x|by)\s*\d+$/.test(normalized);
}

function extractUsableText(content: Clipboard.ReadContent): string | undefined {
  const rawText = content.text ?? "";
  const text = rawText.trim();
  if (!text) return undefined;

  // Skip file/image clipboard entries where the plain-text representation is a synthetic label.
  if (content.file) return undefined;
  if (isLikelyImagePlaceholderText(text)) return undefined;

  return rawText;
}

export async function readClipboardTextAtOffset(
  offset: number,
): Promise<string> {
  const safeOffset = normalizeOffset(offset);
  const content = await Clipboard.read({ offset: safeOffset });
  const text = extractUsableText(content);

  if (!text) {
    throw new Error(
      `Clipboard item at offset ${safeOffset} is not plain text.`,
    );
  }

  return text;
}

export function toSnippet(text: string, limit = 120): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

export interface ClipboardHistoryItem {
  offset: number;
  text: string;
  snippet: string;
}

export async function readClipboardHistory(
  maxOffset = MAX_CLIPBOARD_OFFSET,
): Promise<ClipboardHistoryItem[]> {
  const safeMaxOffset = Math.min(
    normalizeOffset(maxOffset),
    MAX_CLIPBOARD_OFFSET,
  );
  const items: ClipboardHistoryItem[] = [];

  for (let offset = 0; offset <= safeMaxOffset; offset += 1) {
    const content = await Clipboard.read({ offset });
    const text = extractUsableText(content);
    if (!text) continue;

    items.push({
      offset,
      text,
      snippet: toSnippet(text),
    });
  }

  if (items.length === 0) {
    throw new Error("Clipboard history is empty.");
  }

  return items;
}
