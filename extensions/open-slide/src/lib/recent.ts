import { LocalStorage } from "@raycast/api";

const KEY = "recent-decks";
const LIMIT = 60;

/** Deck key to when it was last opened. */
export async function readRecent(): Promise<Record<string, number>> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/**
 * The decks you actually open float to the top, which in a launcher matters
 * more than any amount of sorting by date.
 */
export async function markOpened(key: string): Promise<void> {
  const recent = await readRecent();
  recent[key] = Date.now();

  const trimmed = Object.entries(recent)
    .sort(([, a], [, b]) => b - a)
    .slice(0, LIMIT);
  await LocalStorage.setItem(KEY, JSON.stringify(Object.fromEntries(trimmed)));
}
