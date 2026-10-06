import { LocalStorage } from "@raycast/api";
import { ValueEntry, ValueType } from "./types";

const STORAGE_KEY = "entries";

let storageLock: Promise<void> = Promise.resolve();

function isValidValueType(type: unknown): type is ValueType {
  return (
    typeof type === "string" && ["string", "number", "url", "email", "json", "color"].includes(type)
  );
}

function isValidEntry(entry: unknown): entry is ValueEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.label === "string" &&
    typeof e.value === "string" &&
    isValidValueType(e.type) &&
    typeof e.createdAt === "number" &&
    typeof e.updatedAt === "number"
  );
}

/**
 * Retrieve all stored value entries from LocalStorage.
 * Returns an empty array if nothing is stored or if the data is corrupted.
 * Filters out entries that do not match the expected ValueEntry shape.
 */
export async function getAllEntries(): Promise<ValueEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry);
  } catch {
    return [];
  }
}

/**
 * Queue an async operation behind a shared lock to prevent race conditions
 * during concurrent read-modify-write cycles on LocalStorage.
 */
async function withLock<T>(operation: () => Promise<T>): Promise<T> {
  // Swallow prior failures: a rejected lock must not deadlock every later write.
  const release = storageLock.then(
    () => {},
    () => {},
  );
  let resolveLock: () => void;
  storageLock = new Promise((resolve) => {
    resolveLock = resolve;
  });
  await release;
  try {
    return await operation();
  } finally {
    resolveLock!();
  }
}

/**
 * Append a new entry to the stored list.
 * This operation is atomic and serialized behind a lock.
 */
export async function saveEntry(entry: ValueEntry): Promise<void> {
  await withLock(async () => {
    const entries = await getAllEntries();
    entries.push(entry);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  });
}

/**
 * Update an existing entry in place, matching by id.
 * This operation is atomic and serialized behind a lock.
 */
export async function updateEntry(updated: ValueEntry): Promise<void> {
  await withLock(async () => {
    const entries = await getAllEntries();
    const idx = entries.findIndex((e) => e.id === updated.id);
    if (idx !== -1) {
      entries[idx] = updated;
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  });
}

/**
 * Remove an entry from storage by its id.
 * This operation is atomic and serialized behind a lock.
 */
export async function deleteEntry(id: string): Promise<void> {
  await withLock(async () => {
    const entries = await getAllEntries();
    const filtered = entries.filter((e) => e.id !== id);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  });
}
