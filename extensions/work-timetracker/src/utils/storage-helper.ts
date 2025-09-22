import { LocalStorage } from "@raycast/api";
import type { Project, TimeEntry } from "@models";

/**
 * Keys we persist inside Raycast LocalStorage and their associated value types.
 */
export interface StorageSchema {
  projects: Project[];
  timeEntries: TimeEntry[];
}

const DEFAULTS: StorageSchema = {
  projects: [],
  timeEntries: [],
};

/**
 * Safely reads and parses a JSON item from LocalStorage.
 *
 * If the key is missing or the stored value is malformed JSON this function returns
 * an empty array (the default for that key) instead of throwing.
 */
export async function readItem<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
  try {
    const raw = await LocalStorage.getItem<string>(key as string);
    if (!raw) return DEFAULTS[key];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StorageSchema[K]) : DEFAULTS[key];
  } catch (err) {
    console.error(`Failed to read key "${String(key)}" from LocalStorage:`, err);
    return DEFAULTS[key];
  }
}

/**
 * Stringifies and writes a value back to LocalStorage.
 */
export async function writeItem<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
  try {
    await LocalStorage.setItem(key as string, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write key "${String(key)}" to LocalStorage:`, err);
    throw err;
  }
}
