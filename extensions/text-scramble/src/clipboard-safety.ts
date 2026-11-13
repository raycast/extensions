import type { Clipboard } from "@raycast/api";

type RestorableClipboardContent = string | Clipboard.Content;

export function getRestorableClipboardContent(content: Clipboard.ReadContent): string | Clipboard.Content | null {
  if (typeof content.text !== "string" || typeof content.file === "string") return null;
  if (typeof content.html === "string") return { html: content.html, text: content.text };
  return content.text;
}

export function canSafelyRestoreClipboard(content: Clipboard.ReadContent): boolean {
  return getRestorableClipboardContent(content) !== null;
}

export async function restoreClipboardWithRetry(
  content: RestorableClipboardContent,
  copy: (content: RestorableClipboardContent) => Promise<void>,
  attempts = 3,
  pause: (delayMs: number) => Promise<void> = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
): Promise<void> {
  const maximumAttempts = Math.max(1, attempts);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
    try {
      await copy(content);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maximumAttempts) await pause(50 * attempt);
    }
  }

  throw lastError;
}
