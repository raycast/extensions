/**
 * Concealed clipboard copy, cleared automatically after 30 s.
 *
 * A Raycast command process ends shortly after its window closes, so a plain
 * setTimeout is not enough. Two-level strategy:
 * 1. if the process is still alive after 30 s, clear right away;
 * 2. in any case write a "marker" (SHA-256 of the secret + timestamp) to
 *    LocalStorage: the background `clear-clipboard` command (every minute)
 *    clears the clipboard if it still holds the same secret.
 * Only hashes are stored, and only the current clipboard content is compared.
 */
import { Clipboard, LocalStorage } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";

/** Marker key prefix: one distinct key per copy. */
export const CLIPBOARD_MARKER_KEY = "passig.clipboardMarker";
export const CLIPBOARD_CLEAR_AFTER_MS = 30_000;

interface ClipboardMarker {
  hash: string;
  at: number;
}

function hashOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Every copy writes a marker under its OWN key (`passig.clipboardMarker.<id>`):
 * cleanup removes only the keys it read and processed, so a copy made meanwhile by
 * another command can never lose its marker (no read-modify-write on a shared key).
 */
export async function copySecret(text: string): Promise<void> {
  const marker: ClipboardMarker = { hash: hashOf(text), at: Date.now() };
  const key = `${CLIPBOARD_MARKER_KEY}.${marker.at}.${randomUUID()}`;
  await LocalStorage.setItem(key, JSON.stringify(marker));
  await Clipboard.copy(text, { concealed: true });
  const timer = setTimeout(() => {
    void clearIfStillSecret();
  }, CLIPBOARD_CLEAR_AFTER_MS);
  // do not keep the process alive just for the timer
  timer.unref?.();
}

/**
 * Clears the clipboard if it still holds a secret copied at least 30 s ago (with
 * `force`, regardless of age: used when locking). Only expired/processed markers
 * are removed; newer ones are kept for the next cleanup.
 */
export async function clearIfStillSecret(force = false): Promise<boolean> {
  const all = await LocalStorage.allItems<Record<string, string>>();
  const now = Date.now();
  const due: { key: string; marker: ClipboardMarker | null }[] = [];
  for (const [key, raw] of Object.entries(all)) {
    if (key !== CLIPBOARD_MARKER_KEY && !key.startsWith(`${CLIPBOARD_MARKER_KEY}.`)) continue;
    let marker: ClipboardMarker | null = null;
    try {
      marker = JSON.parse(String(raw)) as ClipboardMarker;
    } catch {
      marker = null; // corrupted marker: just remove it
    }
    if (marker && !force && now - marker.at < CLIPBOARD_CLEAR_AFTER_MS) continue;
    due.push({ key, marker });
  }
  if (due.length === 0) return false;

  let cleared = false;
  const current = await Clipboard.readText();
  if (current) {
    const h = hashOf(current);
    if (due.some((d) => d.marker?.hash === h)) {
      await Clipboard.clear();
      cleared = true;
    }
  }
  for (const d of due) await LocalStorage.removeItem(d.key);
  return cleared;
}
