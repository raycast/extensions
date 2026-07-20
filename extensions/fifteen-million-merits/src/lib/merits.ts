import { LocalStorage } from "@raycast/api";

const MERITS_KEY = "merits";

/**
 * Retrieves the lifetime merits earned by the user.
 */
export async function getMerits(): Promise<number> {
  const stored = await LocalStorage.getItem<number>(MERITS_KEY);
  return stored ?? 0;
}

/**
 * Persists the lifetime merits count.
 */
export async function setMerits(merits: number): Promise<void> {
  await LocalStorage.setItem(MERITS_KEY, Math.max(0, merits));
}

/**
 * Atomically increments the lifetime merits counter by 1.
 */
export async function incrementMerits(): Promise<void> {
  const currentMerits = await getMerits();
  await setMerits(currentMerits + 1);
}

/**
 * Resets the lifetime merits counter to zero.
 */
export async function resetMerits(): Promise<void> {
  await setMerits(0);
}
