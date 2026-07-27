/**
 * Pinned and recently-used icons.
 *
 * Two deliberate departures from the SF Symbols implementation this is modeled
 * on (see docs/FINDINGS.md §4b):
 *
 * 1. **Store ids, not objects.** SF Symbols snapshots whole symbol objects into
 *    its cache; when the schema later gained a field, rehydrated pins lacked it
 *    and threw, breaking the extension outright for anyone with pins. Ids are
 *    rehydrated against the current manifest, so a schema change can't rot them.
 * 2. **Cap on write, not on read.** SF Symbols slices to 16 in its getter, so
 *    the stored array grows forever.
 *
 * Pins and recents are mutually exclusive by construction — pinning promotes an
 * item out of recents, and recents refuse anything pinned. That is what keeps
 * the two sections from showing the same tile twice.
 */

import { Cache } from "@raycast/api";

const cache = new Cache();

const PINNED_KEY = "pinned";
const RECENT_KEY = "recent";

/** Recents beyond this are dropped at write time. */
const RECENT_LIMIT = 24;

function read(key: string): string[] {
  const raw = cache.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    // A corrupt entry should degrade to "no pins", never crash the grid.
    return [];
  }
}

function write(key: string, ids: string[]): void {
  cache.set(key, JSON.stringify(ids));
}

export function getPinnedIds(): string[] {
  return read(PINNED_KEY);
}

export function getRecentIds(): string[] {
  return read(RECENT_KEY);
}

export function isPinned(id: string): boolean {
  return getPinnedIds().includes(id);
}

/** Pin an icon, promoting it out of recents. Most-recently-pinned first. */
export function addPinned(id: string): void {
  removeRecent(id);
  write(PINNED_KEY, [id, ...getPinnedIds().filter((existing) => existing !== id)]);
}

export function removePinned(id: string): void {
  write(
    PINNED_KEY,
    getPinnedIds().filter((existing) => existing !== id),
  );
}

export function togglePinned(id: string): void {
  if (isPinned(id)) removePinned(id);
  else addPinned(id);
}

/** Record a use. No-ops for pinned icons so an item is never in both sections. */
export function addRecent(id: string): void {
  if (isPinned(id)) return;
  const next = [id, ...getRecentIds().filter((existing) => existing !== id)];
  write(RECENT_KEY, next.slice(0, RECENT_LIMIT));
}

function removeRecent(id: string): void {
  write(
    RECENT_KEY,
    getRecentIds().filter((existing) => existing !== id),
  );
}

export function clearRecents(): void {
  write(RECENT_KEY, []);
}
