import { LocalStorage } from "@raycast/api";

// v2 schema: { bundleId: { hidden?: true, snoozedUntil?: epochMs } }
// Backward-compatible read of legacy v1 set-of-strings.
const KEY = "mac-updater-ignored-bundles-v2";
const LEGACY_KEY = "mac-updater-ignored-bundles-v1";

interface IgnoreEntry {
  hidden?: boolean;
  snoozedUntil?: number;
}

type IgnoreMap = Record<string, IgnoreEntry>;

async function readRaw(): Promise<IgnoreMap> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as IgnoreMap;
    } catch {
      // fall through
    }
  }
  // One-time migration from v1 (set of bundle IDs treated as hidden=true)
  const legacy = await LocalStorage.getItem<string>(LEGACY_KEY);
  if (legacy) {
    try {
      const ids = JSON.parse(legacy) as string[];
      const migrated: IgnoreMap = {};
      for (const id of ids) migrated[id] = { hidden: true };
      await LocalStorage.setItem(KEY, JSON.stringify(migrated));
      await LocalStorage.removeItem(LEGACY_KEY);
      return migrated;
    } catch {
      // ignore
    }
  }
  return {};
}

async function write(map: IgnoreMap): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(map));
}

function isActivelyIgnored(entry: IgnoreEntry, now: number): boolean {
  if (entry.hidden) return true;
  if (entry.snoozedUntil && entry.snoozedUntil > now) return true;
  return false;
}

export interface IgnoreState {
  bundleId: string;
  hidden: boolean;
  snoozedUntil?: number;
}

/** Returns the bundle IDs that are currently suppressed (hidden or actively snoozed). */
export async function getIgnoredBundles(): Promise<Set<string>> {
  const map = await readRaw();
  const now = Date.now();
  const set = new Set<string>();
  let dirty = false;
  for (const [id, entry] of Object.entries(map)) {
    if (isActivelyIgnored(entry, now)) {
      set.add(id);
    } else if (entry.snoozedUntil && entry.snoozedUntil <= now) {
      // Snooze expired — clear it so we don't carry stale data forever
      delete map[id];
      dirty = true;
    }
  }
  if (dirty) await write(map);
  return set;
}

export async function getIgnoreStates(): Promise<IgnoreState[]> {
  const map = await readRaw();
  const now = Date.now();
  const out: IgnoreState[] = [];
  for (const [id, entry] of Object.entries(map)) {
    if (!isActivelyIgnored(entry, now)) continue;
    out.push({
      bundleId: id,
      hidden: !!entry.hidden,
      snoozedUntil: entry.snoozedUntil,
    });
  }
  return out;
}

export async function ignoreApp(bundleId: string): Promise<void> {
  const map = await readRaw();
  map[bundleId] = { hidden: true };
  await write(map);
}

export async function snoozeApp(bundleId: string, days: number): Promise<void> {
  const map = await readRaw();
  map[bundleId] = { snoozedUntil: Date.now() + days * 24 * 60 * 60 * 1000 };
  await write(map);
}

export async function unignoreApp(bundleId: string): Promise<void> {
  const map = await readRaw();
  delete map[bundleId];
  await write(map);
}

export async function clearIgnored(): Promise<void> {
  await LocalStorage.removeItem(KEY);
  await LocalStorage.removeItem(LEGACY_KEY);
}
