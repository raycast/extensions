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
 * NSPasteboard.changeCount bumps on every clipboard write, so only a bump
 * proves the Cmd+C keystroke actually copied a selection. An unchanged
 * clipboard is ambiguous: it could be a terminal that auto-copied on select,
 * or stale contents (a password copied earlier) with no selection at all.
 * Quoting on ambiguity risks pasting secrets, so we bail instead. Auto-copy
 * terminals still work because they re-copy the selection on Cmd+C.
 */
export function resolveSelectionAfterCopy(before: ClipboardState, after: ClipboardState): string | null {
  if (after.changeCount === before.changeCount) return null;
  return after.text || null;
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
