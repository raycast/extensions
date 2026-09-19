import { LocalStorage } from "@raycast/api";
import { applyStreakRules, Streak, STORAGE_KEY } from "./types";

/** Serialize all storage mutations so concurrent commands don't clobber each other. */
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  // Keep the queue alive even if a write fails
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readRawStreaks(): Promise<Streak[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Streak[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRawStreaks(streaks: Streak[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(streaks));
}

/**
 * Load streaks, apply auto-reset/migration, persist if needed.
 * Safe to call from multiple commands.
 */
export async function getStreaks(): Promise<Streak[]> {
  return enqueueWrite(async () => {
    const parsed = await readRawStreaks();
    const { streaks, changed } = applyStreakRules(parsed);
    if (changed) {
      await writeRawStreaks(streaks);
    }
    return streaks;
  });
}

export async function saveStreaks(streaks: Streak[]): Promise<void> {
  return enqueueWrite(async () => {
    await writeRawStreaks(streaks);
  });
}

export async function addStreak(streak: Streak): Promise<void> {
  return enqueueWrite(async () => {
    const parsed = await readRawStreaks();
    const { streaks } = applyStreakRules(parsed);
    streaks.push(streak);
    await writeRawStreaks(streaks);
  });
}

export async function updateStreak(updated: Streak): Promise<void> {
  return enqueueWrite(async () => {
    const parsed = await readRawStreaks();
    const { streaks } = applyStreakRules(parsed);
    const index = streaks.findIndex((s) => s.id === updated.id);
    if (index === -1) return;
    streaks[index] = updated;
    await writeRawStreaks(streaks);
  });
}

export async function deleteStreak(id: string): Promise<void> {
  return enqueueWrite(async () => {
    const parsed = await readRawStreaks();
    const { streaks } = applyStreakRules(parsed);
    const filtered = streaks.filter((s) => s.id !== id);
    await writeRawStreaks(filtered);
  });
}
