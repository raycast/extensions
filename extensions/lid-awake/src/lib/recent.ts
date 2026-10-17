import { LocalStorage } from "@raycast/api";
import { PRESETS } from "./session";

// Kept apart from the "session:" keys, which session.ts reads as stored sessions.
const RECENT_KEY = "recent-durations";
export const MAX_RECENT = 3;

// Newest first. Preset durations are already listed in the menu, so they are never remembered.
export function addRecentDuration(list: number[], minutes: number): number[] {
  if (PRESETS.includes(minutes)) {
    return list;
  }
  return [minutes, ...list.filter((entry) => entry !== minutes)].slice(0, MAX_RECENT);
}

// Anything unreadable counts as no recent durations, so a bad stored value never breaks the menu.
export async function getRecentDurations(): Promise<number[]> {
  try {
    const raw = await LocalStorage.getItem<string>(RECENT_KEY);
    if (raw === undefined) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is number => Number.isSafeInteger(entry) && entry > 0).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

// Remembering is best effort: a failed write must never stop a duration from starting.
export async function rememberDuration(minutes: number): Promise<void> {
  try {
    const list = addRecentDuration(await getRecentDurations(), minutes);
    await LocalStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Ignored on purpose, see above.
  }
}
