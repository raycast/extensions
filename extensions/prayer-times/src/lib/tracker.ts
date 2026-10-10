import { getPrayerStatuses, setPrayerCompleted, syncPrayerReminders } from "./helper";
import { addDays, getDaySchedule, PRAYER_KEYS, PrayerKey, PrayerSlot, toDateKey } from "./prayers";
import { planHash, planReminders } from "./plan";
import { Settings } from "./settings";
import {
  clearSnoozes,
  readLocalLog,
  readPlanState,
  trackingSince,
  writeLocalPrayed,
  writePlanState,
  writeSyncError,
} from "./storage";

/** Reminders are re-checked at least this often even when the plan is unchanged. */
const RESYNC_INTERVAL = 6 * 60 * 60_000;

/** One prayer's reminder state. Absent from History when no reminder exists for it. */
export interface PrayerRecord {
  completed: boolean;
  completedAt?: Date;
  /** Completed before the prayer's time ended. */
  onTime: boolean;
}

/** Reminder state keyed by local date, then prayer. */
export type History = Record<string, Partial<Record<PrayerKey, PrayerRecord>>>;

/** Outcome of a reminder sync. */
export interface SyncOutcome {
  ran: boolean;
  created: number;
  updated: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Keep the next `days` of prayer reminders in Reminders, creating missing ones and moving changed ones.
 * Skipped when the plan is unchanged and the last sync is recent, unless forced.
 *
 * @param settings - Settings.
 * @param now - Current instant.
 * @param force - Sync even when nothing changed.
 * @returns What the sync did.
 */
export async function syncReminders(settings: Settings, now = new Date(), force = false): Promise<SyncOutcome> {
  if (!settings.reminders.enabled) return { ran: false, created: 0, updated: 0 };
  const planned = planReminders(now, settings.schedule, settings.plan);
  const plan = settings.reminders.alarms ? planned : planned.map((item) => ({ ...item, alarms: [] }));
  const { listName, cleanMissedAfterDays } = settings.reminders;
  const hash = `${listName}|${cleanMissedAfterDays}|${planHash(plan)}`;
  const last = await readPlanState();
  const stale = !last || now.getTime() - new Date(last.at).getTime() > RESYNC_INTERVAL;
  if (!force && last?.hash === hash && !stale) return { ran: false, created: 0, updated: 0 };

  try {
    const result = await syncPrayerReminders({ listName, reminders: plan, staleAfterDays: cleanMissedAfterDays });
    await writePlanState({ hash, at: now.toISOString() });
    return { ran: true, created: result.created, updated: result.updated };
  } catch (error) {
    await writeSyncError(errorMessage(error));
    throw error;
  }
}

/** Completion by slot id, from Reminders or the local log. */
type CompletionMap = Map<string, { isCompleted: boolean; completionDate?: string }>;

async function localCompletions(from: Date, to: Date): Promise<CompletionMap> {
  const [log, since] = await Promise.all([readLocalLog(), trackingSince(toDateKey(new Date()))]);
  const map: CompletionMap = new Map();
  for (let day = from; toDateKey(day) <= toDateKey(to); day = addDays(day, 1)) {
    const date = toDateKey(day);
    if (date < since) continue;
    for (const key of PRAYER_KEYS) {
      const at = log[date]?.[key];
      map.set(`${date}/${key}`, { isCompleted: Boolean(at), completionDate: at });
    }
  }
  return map;
}

/**
 * Read prayer completion for a date range and attach on-time status. Uses Apple Reminders, or the
 * local log when Reminders is off. Prayers with no record are left out (shown as "no data").
 *
 * @param settings - Settings.
 * @param from - First day.
 * @param to - Last day (inclusive).
 * @returns History for the range.
 */
export async function loadHistory(settings: Settings, from: Date, to: Date): Promise<History> {
  const byKey: CompletionMap = settings.reminders.enabled
    ? new Map(
        (await getPrayerStatuses(settings.reminders.listName, toDateKey(from), toDateKey(to))).map((status) => [
          status.key,
          status,
        ]),
      )
    : await localCompletions(from, to);
  const history: History = {};

  for (let day = from; toDateKey(day) <= toDateKey(to); day = addDays(day, 1)) {
    for (const slot of getDaySchedule(day, settings.schedule)) {
      const status = byKey.get(slot.id);
      if (!status) continue;
      const completedAt = status.completionDate ? new Date(status.completionDate) : undefined;
      history[slot.date] ??= {};
      history[slot.date][slot.key] = {
        completed: status.isCompleted,
        completedAt,
        onTime: status.isCompleted && (!completedAt || completedAt < slot.end),
      };
    }
  }
  return history;
}

/**
 * Slot ids (`date/key`) whose reminder is completed.
 *
 * @param history - Reminder history.
 * @returns Set of prayed slot ids.
 */
export function prayedSet(history: History): Set<string> {
  const ids = new Set<string>();
  for (const [date, day] of Object.entries(history)) {
    for (const key of PRAYER_KEYS) if (day[key]?.completed) ids.add(`${date}/${key}`);
  }
  return ids;
}

/**
 * Mark or unmark a prayer. With Reminders on, ticks its reminder (syncing first if it doesn't exist yet);
 * otherwise writes the local log.
 *
 * @param slot - Prayer slot.
 * @param settings - Settings.
 * @param completed - True to mark prayed.
 * @param at - Completion time; defaults to now.
 * @throws Error when the reminder still can't be found.
 */
export async function setPrayed(slot: PrayerSlot, settings: Settings, completed: boolean, at?: Date): Promise<void> {
  if (!settings.reminders.enabled) {
    await writeLocalPrayed(slot.date, slot.key, completed ? (at ?? new Date()).toISOString() : undefined);
  } else {
    const { listName } = settings.reminders;
    let found = await setPrayerCompleted(listName, slot.id, completed, completed ? at : undefined);
    if (!found) {
      await syncReminders(settings, new Date(), true);
      found = await setPrayerCompleted(listName, slot.id, completed, completed ? at : undefined);
    }
    if (!found) throw new Error(`No reminder for ${slot.name} on ${slot.date} in "${listName}"`);
  }
  if (completed) await clearSnoozes(slot.id);
}

/**
 * The completion time recorded when a prayer is marked on time or late after the fact.
 * On time: now if the prayer time is still running, else the jamaat (or start) time.
 * Late: the moment the prayer time ended, or now if that is later.
 *
 * @param slot - Prayer slot.
 * @param onTime - Desired status.
 * @param now - Current instant.
 * @returns Completion time to store.
 */
export function completionTimeFor(slot: PrayerSlot, onTime: boolean, now = new Date()): Date {
  if (onTime) return now < slot.end ? now : (slot.jamaat ?? slot.start);
  return now > slot.end ? now : slot.end;
}

/**
 * Mark a prayer prayed and set whether it counts as on time.
 *
 * @param slot - Prayer slot.
 * @param settings - Settings.
 * @param onTime - True for on time, false for late (qaza).
 */
export function setOnTime(slot: PrayerSlot, settings: Settings, onTime: boolean): Promise<void> {
  return setPrayed(slot, settings, true, completionTimeFor(slot, onTime));
}
