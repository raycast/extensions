import { LocalStorage } from "@raycast/api";
import { AlertKind } from "./state";

/** A snoozed Raycast popup waiting to open again. */
export interface Snooze {
  slotId: string;
  kind: AlertKind;
  /** ISO time to fire again. */
  until: string;
}

/** Last successful reminder sync. */
export interface PlanState {
  hash: string;
  /** ISO time of the sync. */
  at: string;
  /** Reminders list synced to; older states only have it at the start of `hash`. */
  listName?: string;
}

const KEYS = {
  fired: "fired",
  snoozes: "snoozes",
  plan: "plan",
  syncError: "syncError",
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

/**
 * Popup alert ids already delivered.
 *
 * @returns Set of alert ids.
 */
export async function readFired(): Promise<Set<string>> {
  return new Set(await readJson<string[]>(KEYS.fired, []));
}

/**
 * Remember delivered popup alerts, dropping ids for dates before `keepFrom`.
 *
 * @param ids - Alert ids to add.
 * @param keepFrom - Earliest date key to keep.
 */
export async function addFired(ids: string[], keepFrom: string): Promise<void> {
  const fired = await readFired();
  for (const id of ids) fired.add(id);
  await writeJson(
    KEYS.fired,
    [...fired].filter((id) => id.slice(0, 10) >= keepFrom),
  );
}

/**
 * Pending snoozes.
 *
 * @returns Snoozes, any order.
 */
export function readSnoozes(): Promise<Snooze[]> {
  return readJson<Snooze[]>(KEYS.snoozes, []);
}

/**
 * Replace the snooze list.
 *
 * @param snoozes - New list.
 */
export function writeSnoozes(snoozes: Snooze[]): Promise<void> {
  return writeJson(KEYS.snoozes, snoozes);
}

/**
 * Snooze a popup for a number of minutes, replacing any earlier snooze for the same slot.
 *
 * @param slotId - Slot id.
 * @param kind - Alert kind.
 * @param minutes - Delay.
 * @param now - Current instant.
 */
export async function snooze(slotId: string, kind: AlertKind, minutes: number, now = new Date()): Promise<void> {
  const rest = (await readSnoozes()).filter((s) => s.slotId !== slotId);
  rest.push({ slotId, kind, until: new Date(now.getTime() + minutes * 60_000).toISOString() });
  await writeSnoozes(rest);
}

/**
 * Drop snoozes for a slot, e.g. once it's prayed.
 *
 * @param slotId - Slot id.
 */
export async function clearSnoozes(slotId: string): Promise<void> {
  const snoozes = await readSnoozes();
  const rest = snoozes.filter((s) => s.slotId !== slotId);
  if (rest.length !== snoozes.length) await writeSnoozes(rest);
}

/**
 * The last successful reminder sync.
 *
 * @returns Plan state, if any sync has run.
 */
export function readPlanState(): Promise<PlanState | undefined> {
  return readJson<PlanState | undefined>(KEYS.plan, undefined);
}

/**
 * Store a successful sync and clear the last error.
 *
 * @param state - Plan hash and time.
 */
export async function writePlanState(state: PlanState): Promise<void> {
  await writeJson(KEYS.plan, state);
  await LocalStorage.removeItem(KEYS.syncError);
}

/**
 * Last reminder sync error, for display.
 *
 * @returns Error message, if the last sync failed.
 */
export function readSyncError(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(KEYS.syncError);
}

/**
 * Store a reminder sync error.
 *
 * @param message - Error message.
 */
export function writeSyncError(message: string): Promise<void> {
  return LocalStorage.setItem(KEYS.syncError, message);
}

/** Prayed marks kept in Raycast when Apple Reminders is off: date → prayer → ISO completion time. */
export type LocalLog = Record<string, Partial<Record<string, string>>>;

const LOCAL_KEYS = { log: "localLog", since: "trackingSince" } as const;

/**
 * Prayed marks kept in Raycast.
 *
 * @returns Local log.
 */
export function readLocalLog(): Promise<LocalLog> {
  return readJson<LocalLog>(LOCAL_KEYS.log, {});
}

/**
 * Set or clear a prayed mark in the local log.
 *
 * @param date - Local date key.
 * @param key - Prayer key.
 * @param completedAt - ISO completion time, or undefined to clear.
 */
export async function writeLocalPrayed(date: string, key: string, completedAt: string | undefined): Promise<void> {
  const log = await readLocalLog();
  const day = log[date] ?? {};
  if (completedAt) day[key] = completedAt;
  else delete day[key];
  log[date] = day;
  await writeJson(LOCAL_KEYS.log, log);
}

/**
 * First date local tracking covered; earlier days count as "no data". Set on first call.
 *
 * @param today - Today's date key, stored if nothing is stored yet.
 * @returns Date key.
 */
export async function trackingSince(today: string): Promise<string> {
  const stored = await LocalStorage.getItem<string>(LOCAL_KEYS.since);
  if (stored) return stored;
  await LocalStorage.setItem(LOCAL_KEYS.since, today);
  return today;
}
