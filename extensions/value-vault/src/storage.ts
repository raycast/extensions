import { LocalStorage } from "@raycast/api";
import { ValueEntry, ValueType } from "./types";

const LEGACY_KEY = "entries";
const ENTRY_PREFIX = "entry:";

function keyFor(id: string): string {
  return `${ENTRY_PREFIX}${id}`;
}

function isValidValueType(type: unknown): type is ValueType {
  return typeof type === "string" && ["string", "number", "url", "email", "json", "color"].includes(type);
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

function parseEntry(raw: unknown): ValueEntry | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValidEntry(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * One-time migration from the original single-array format.
 * Each legacy entry is fanned out to its own key; concurrent runs
 * converge because they write identical content.
 */
async function migrateLegacyStorage(): Promise<void> {
  const raw = await LocalStorage.getItem<string>(LEGACY_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (isValidEntry(item)) {
          await LocalStorage.setItem(keyFor(item.id), JSON.stringify(item));
        }
      }
    }
  } catch {
    // Corrupted legacy data is unrecoverable; drop it like the old reader did.
  }
  await LocalStorage.removeItem(LEGACY_KEY);
}

/**
 * Retrieve all stored value entries.
 * Entries live under individual keys, so concurrent writers in separate
 * command processes cannot clobber each other the way a shared array could.
 */
export async function getAllEntries(): Promise<ValueEntry[]> {
  await migrateLegacyStorage();
  const items = await LocalStorage.allItems();
  const entries: ValueEntry[] = [];
  for (const [key, raw] of Object.entries(items)) {
    if (!key.startsWith(ENTRY_PREFIX)) continue;
    const entry = parseEntry(raw);
    if (entry) entries.push(entry);
  }
  return entries;
}

/**
 * Persist a new entry under its own key. Last writer wins per entry;
 * entries never share a key, so saves cannot erase each other.
 */
export async function saveEntry(entry: ValueEntry): Promise<void> {
  await LocalStorage.setItem(keyFor(entry.id), JSON.stringify(entry));
}

/**
 * Overwrite the stored entry with this id, or create it if absent.
 */
export async function updateEntry(updated: ValueEntry): Promise<void> {
  await LocalStorage.setItem(keyFor(updated.id), JSON.stringify(updated));
}

/**
 * Remove the entry with this id. Missing entries are a no-op.
 */
export async function deleteEntry(id: string): Promise<void> {
  await LocalStorage.removeItem(keyFor(id));
}
