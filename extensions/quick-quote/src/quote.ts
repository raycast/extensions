export function isMeaningfulSelection(text: string): boolean {
  return text.trim().length > 0;
}

export function quoteText(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const trimmed = normalized.replace(/\n+$/, "");
  if (!trimmed) return "";
  const prefixed = trimmed
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `${prefixed}\n`;
}

export function resolveSelectionAfterCopy(original: string, after: string): string | null {
  if (!after) return null;
  if (after === original) return original;
  return after;
}

export interface ClipboardSnapshot {
  text: string;
  file?: string;
  html?: string;
}

export function toRestorableContent(
  snapshot: ClipboardSnapshot,
): string | { file: string } | { html: string; text: string } {
  if (snapshot.file) return { file: snapshot.file };
  if (snapshot.html) return { html: snapshot.html, text: snapshot.text };
  return snapshot.text;
}
