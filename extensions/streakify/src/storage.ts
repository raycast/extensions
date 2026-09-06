import { LocalStorage } from "@raycast/api";
import { applyStreakRules, Streak, STORAGE_KEY } from "./types";

export async function getStreaks(): Promise<Streak[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Streak[];
    if (!Array.isArray(parsed)) return [];

    // Apply auto-reset + migration every time we load
    const { streaks, changed } = applyStreakRules(parsed);
    if (changed) {
      await saveStreaks(streaks);
    }
    return streaks;
  } catch {
    return [];
  }
}

export async function saveStreaks(streaks: Streak[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(streaks));
}

export async function addStreak(streak: Streak): Promise<void> {
  const streaks = await getStreaks();
  streaks.push(streak);
  await saveStreaks(streaks);
}

export async function updateStreak(updated: Streak): Promise<void> {
  const streaks = await getStreaks();
  const index = streaks.findIndex((s) => s.id === updated.id);
  if (index === -1) return;
  streaks[index] = updated;
  await saveStreaks(streaks);
}

export async function deleteStreak(id: string): Promise<void> {
  const streaks = await getStreaks();
  const filtered = streaks.filter((s) => s.id !== id);
  await saveStreaks(filtered);
}
