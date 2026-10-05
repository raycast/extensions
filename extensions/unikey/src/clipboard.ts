import { Clipboard, closeMainWindow } from "@raycast/api";
import { clipboardClearSeconds } from "./preferences";

let clearTimer: NodeJS.Timeout | null = null;

function scheduleClipboardClear(): void {
  const ms = clipboardClearSeconds();
  if (ms > 0) {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      void Clipboard.clear().catch(() => {});
    }, ms);
  }
}

export async function copySecret(text: string): Promise<void> {
  await Clipboard.copy(text);
  scheduleClipboardClear();
}

/**
 * Copy, close Raycast, paste into the previously focused app.
 * Primary action — Enter on a password fills it into the login form you had open.
 */
export async function copyPasteSecret(text: string): Promise<void> {
  await Clipboard.copy(text);
  await closeMainWindow();
  // Give the previously focused app a beat to regain focus before pasting
  await new Promise((r) => setTimeout(r, 100));
  await Clipboard.paste(text);
  scheduleClipboardClear();
}

/** Copy only — Raycast stays open. */
export async function copyOnly(text: string): Promise<void> {
  await Clipboard.copy(text);
  scheduleClipboardClear();
}

/** Paste into the focused app without keeping a copy in the clipboard afterwards. */
export async function pasteSecret(text: string): Promise<void> {
  await Clipboard.copy(text);
  await closeMainWindow();
  await new Promise((r) => setTimeout(r, 100));
  await Clipboard.paste(text);
}
