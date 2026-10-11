import { LocalStorage } from "@raycast/api";

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// True once `intervalMinutes` has passed since the last true call for this
// key. A non-positive interval means disabled, not "always due".
export async function dueToRun(key: string, intervalMinutes: number): Promise<boolean> {
  if (intervalMinutes <= 0) return false;

  const lastRun = await LocalStorage.getItem<string>(key);
  const elapsedMinutes = lastRun ? (Date.now() - parseInt(lastRun, 10)) / 60_000 : Infinity;
  if (elapsedMinutes < intervalMinutes) return false;

  await LocalStorage.setItem(key, String(Date.now()));
  return true;
}

// Stamps a manual run so the next scheduled tick doesn't fire immediately.
export async function markRun(key: string): Promise<void> {
  await LocalStorage.setItem(key, String(Date.now()));
}
