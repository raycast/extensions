import { LocalStorage } from "@raycast/api";
import { TimeZoneConfig } from "./config";

const STORAGE_KEY = "saved_timezones";

export async function getSavedTimeZones(): Promise<TimeZoneConfig[]> {
  const saved = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!saved) return [];
  return JSON.parse(saved);
}

export async function saveTimeZones(
  timezones: TimeZoneConfig[],
): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(timezones));
}
