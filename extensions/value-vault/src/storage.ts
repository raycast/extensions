import { LocalStorage } from "@raycast/api";
import { ValueEntry, ValueType } from "./types";

const LEGACY_KEY = "entries";
const ENTRY_PREFIX = "entry:";
const TOMBSTONE_PREFIX = "deleted:";

function keyFor(id: string): string {
  return `${ENTRY_PREFIX}${id}`;
}

function tombstoneFor(id: string): string {
  return `${TOMBSTONE_PREFIX}${id}`;
}

function idFromKey(key: string, prefix: string): string {
  return key.slice(prefix.length);
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

async function readTombstones(): Promise<Set<string>> {
  const items = await LocalStorage.allItems();
  return new Set(
    Object.keys(items)
      .filter((key) => key.startsWith(TOMBSTONE_PREFIX))
      .map((key) => idFromKey(key, TOMBSTONE_PREFIX)),
  );
}

/**
 * One-time migration from the original single-array format.
 * The legacy array is removed only after every surviving entry has its own
 * key, so a failed run keeps the array and retries on the next load instead
 * of erasing values that were never moved. Concurrent runs converge because
 * they write identical content.
 */
async function migrateLegacyStorage(): Promise<void> {
  const raw = await LocalStorage.getItem<string>(LEGACY_KEY);
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    await LocalStorage.removeItem(LEGACY_KEY);
    return;
  }
  if (!Array.isArray(parsed)) {
    await LocalStorage.removeItem(LEGACY_KEY);
    return;
  }
  const tombstoned = await readTombstones();
  for (const item of parsed) {
    if (!isValidEntry(item) || tombstoned.has(item.id)) continue;
    try {
      await LocalStorage.setItem(keyFor(item.id), JSON.stringify(item));
    } catch {
      return;
    }
  }
  await LocalStorage.removeItem(LEGACY_KEY);
  await pruneStaleTombstones();
}

async function pruneStaleTombstones(): Promise<void> {
  const items = await LocalStorage.allItems();
  const live = new Set(
    Object.keys(items)
      .filter((key) => key.startsWith(ENTRY_PREFIX))
      .map((key) => idFromKey(key, ENTRY_PREFIX)),
  );
  for (const key of Object.keys(items)) {
    // Markers shadowing a live entry are load-bearing: keep them so a
    // resurrected secret stays hidden. Only drop markers with no entry left.
    if (key.startsWith(TOMBSTONE_PREFIX) && !live.has(idFromKey(key, TOMBSTONE_PREFIX))) {
      await LocalStorage.removeItem(key);
    }
  }
}

/**
 * Retrieve all stored value entries.
 * Entries live under individual keys, so concurrent writers in separate
 * command processes cannot clobber each other the way a shared array could.
 * Ids deleted mid-migration stay hidden via their tombstones.
 */
export async function getAllEntries(): Promise<ValueEntry[]> {
  await migrateLegacyStorage();
  const items = await LocalStorage.allItems();
  const tombstoned = new Set(
    Object.keys(items)
      .filter((key) => key.startsWith(TOMBSTONE_PREFIX))
      .map((key) => idFromKey(key, TOMBSTONE_PREFIX)),
  );
  const entries: ValueEntry[] = [];
  for (const [key, raw] of Object.entries(items)) {
    if (!key.startsWith(ENTRY_PREFIX)) continue;
    if (tombstoned.has(idFromKey(key, ENTRY_PREFIX))) continue;
    const entry = parseEntry(raw);
    if (entry) entries.push(entry);
  }
  return entries;
}

/**
 * Persist a new entry under its own key. Last writer wins per entry;
 * entries never share a key, so saves cannot erase each other.
 * An explicit save clears any deletion marker for the id.
 */
export async function saveEntry(entry: ValueEntry): Promise<void> {
  await LocalStorage.setItem(keyFor(entry.id), JSON.stringify(entry));
  await LocalStorage.removeItem(tombstoneFor(entry.id));
}

/**
 * Overwrite the stored entry with this id, or create it if absent.
 */
export async function updateEntry(updated: ValueEntry): Promise<void> {
  await LocalStorage.setItem(keyFor(updated.id), JSON.stringify(updated));
  await LocalStorage.removeItem(tombstoneFor(updated.id));
}

/**
 * Remove the entry with this id. Missing entries are a no-op.
 * While the legacy array still exists, a marker is left behind so a
 * migration running in another process cannot resurrect the deleted id.
 * Markers are skipped once migration is ancient history to avoid key litter.
 */
export async function deleteEntry(id: string): Promise<void> {
  await LocalStorage.removeItem(keyFor(id));
  if (await LocalStorage.getItem<string>(LEGACY_KEY)) {
    await LocalStorage.setItem(tombstoneFor(id), "1");
  }
}
