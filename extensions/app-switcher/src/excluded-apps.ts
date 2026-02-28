import { LocalStorage } from "@raycast/api";

const EXCLUDED_APPS_KEY = "excludedApps";

export async function getExcludedApps(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(EXCLUDED_APPS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function addExcludedApp(bundleId: string): Promise<void> {
  const excluded = await getExcludedApps();
  if (!excluded.includes(bundleId)) {
    excluded.push(bundleId);
    await LocalStorage.setItem(EXCLUDED_APPS_KEY, JSON.stringify(excluded));
  }
}

export async function removeExcludedApp(bundleId: string): Promise<void> {
  const excluded = await getExcludedApps();
  const updated = excluded.filter((id) => id !== bundleId);
  await LocalStorage.setItem(EXCLUDED_APPS_KEY, JSON.stringify(updated));
}
