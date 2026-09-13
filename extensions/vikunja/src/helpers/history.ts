import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "quickAddHistory";

/** How many past inputs to keep. Older entries fall off the end. */
export const HISTORY_LIMIT = 15;

/**
 * Reads the Quick Add input history, newest first.
 *
 * Returns an empty list rather than throwing when the stored value is missing
 * or malformed, so a corrupted entry can never block the command from opening.
 */
export async function loadHistory(): Promise<string[]> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Puts `input` at the front of the history.
 *
 * The raw text is stored on purpose: relative dates like "tomorrow" should be
 * re-parsed when the entry is reused, not frozen to the original date.
 * Case-insensitive duplicates are collapsed so reusing an entry does not stack up.
 */
export async function addToHistory(input: string): Promise<string[]> {
  const entry = input.trim();
  if (!entry) return loadHistory();

  const existing = await loadHistory();
  const deduped = existing.filter(
    (e) => e.toLowerCase() !== entry.toLowerCase(),
  );
  const next = [entry, ...deduped].slice(0, HISTORY_LIMIT);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Removes one entry, matched case-insensitively. */
export async function removeFromHistory(input: string): Promise<string[]> {
  const entry = input.trim().toLowerCase();
  const next = (await loadHistory()).filter((e) => e.toLowerCase() !== entry);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** Drops the whole history. */
export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
