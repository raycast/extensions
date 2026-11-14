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

export interface ClipboardState {
  text: string;
  changeCount: number;
}

/**
 * NSPasteboard.changeCount bumps on every clipboard write. Exactly one bump
 * after Cmd+C is the copy we sent; no bump is a stale clipboard; more than
 * one bump means another writer also touched the pasteboard. Auto-copy
 * terminals still work because they re-copy the selection on Cmd+C (one bump).
 */
export function resolveSelectionAfterCopy(before: ClipboardState, after: ClipboardState): string | null {
  if (after.changeCount - before.changeCount !== 1) return null;
  return after.text || null;
}

/** Second Cmd+C must reproduce the first sample; a mismatch is another writer. */
export function confirmCopySamples(first: string | null, second: string | null): string | null {
  if (first == null || first !== second) return null;
  return first;
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
