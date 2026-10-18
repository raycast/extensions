import { getPrayerStatuses, movePrayerReminders, setPrayerCompleted, syncPrayerReminders } from "./helper";
import { addDays, getDaySchedule, PRAYER_KEYS, PrayerKey, PrayerSlot, toDateKey } from "./prayers";
import { planHash, planReminders } from "./plan";
import { Settings } from "./settings";
import { clockStatus, countsOnTime, PrayedStatus, prayedAt, PrayerStatusValue, statusOf } from "./status";
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
  /** Prayed with jamaat or on time. */
  onTime: boolean;
  /** How it was prayed, or missed; undefined while an unmarked prayer's time is still running. */
  status?: PrayerStatusValue;
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

  // After the Reminders List setting changes, bring the prayers (and their history) along, so the old
  // list stops alerting and Today's Prayers keeps its past days.
  const previousList = last && (last.listName ?? last.hash.split("|")[0]);
  try {
    if (previousList && previousList !== listName) await movePrayerReminders(previousList, listName);
    const result = await syncPrayerReminders({ listName, reminders: plan, staleAfterDays: cleanMissedAfterDays });
    await writePlanState({ hash, at: now.toISOString(), listName });
    return { ran: true, created: result.created, updated: result.updated };
  } catch (error) {
    await writeSyncError(errorMessage(error));
    throw error;
  }
}

/** Completion and written status by slot id, from Reminders or the local log. */
type CompletionMap = Map<string, { isCompleted: boolean; completionDate?: string; status?: string }>;

async function localCompletions(from: Date, to: Date): Promise<CompletionMap> {
  const [log, since] = await Promise.all([readLocalLog(), trackingSince(toDateKey(new Date()))]);
  const map: CompletionMap = new Map();
  for (let day = from; toDateKey(day) <= toDateKey(to); day = addDays(day, 1)) {
    const date = toDateKey(day);
    for (const key of PRAYER_KEYS) {
      const saved = log[date]?.[key];
      const mark = typeof saved === "string" ? { at: saved } : saved;
      // Before tracking started, only saved marks count; unmarked prayers stay "no data", not missed.
      if (date < since && !mark) continue;
      map.set(`${date}/${key}`, { isCompleted: Boolean(mark), completionDate: mark?.at, status: mark?.status });
    }
  }
  return map;
}

/**
 * Read prayer completion for a date range and attach each prayer's status. Uses Apple Reminders, or the
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
  const now = new Date();

  for (let day = from; toDateKey(day) <= toDateKey(to); day = addDays(day, 1)) {
    for (const slot of getDaySchedule(day, settings.schedule)) {
      const status = byKey.get(slot.id);
      if (!status) continue;
      const completedAt = status.completionDate ? new Date(status.completionDate) : undefined;
      const value = statusOf(slot, status.isCompleted, completedAt, status.status, now);
      history[slot.date] ??= {};
      history[slot.date][slot.key] = {
        completed: status.isCompleted,
        completedAt,
        onTime: countsOnTime(value),
        status: value,
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
 * Create the reminder for one past prayer, without alarms, so it can be marked. The regular sync only
 * fills today and later days, and a past day's reminder may be missing (e.g. before installing).
 *
 * @param slot - Past prayer slot.
 * @param settings - Settings.
 */
async function createPastReminder(slot: PrayerSlot, settings: Settings): Promise<void> {
  const day = new Date(`${slot.date}T12:00:00`);
  const reminders = planReminders(day, settings.schedule, { ...settings.plan, days: 1 })
    .filter((item) => item.key === slot.id)
    .map((item) => ({ ...item, alarms: [] }));
  const { listName, cleanMissedAfterDays } = settings.reminders;
  await syncPrayerReminders({ listName, reminders, staleAfterDays: cleanMissedAfterDays });
}

/**
 * Mark a prayer with a status, or unmark it. With Reminders on, ticks its reminder and writes its
 * `prayer-status:` line (creating the reminder first if it doesn't exist yet: a full sync for today and
 * later, just that reminder for a past day); otherwise writes the local log. The completion time is when
 * it was prayed, from {@link prayedAt}.
 *
 * @param slot - Prayer slot.
 * @param settings - Settings.
 * @param status - How it was prayed; undefined unmarks it.
 * @param now - When it is marked.
 * @throws Error when the reminder still can't be found.
 */
export async function setStatus(
  slot: PrayerSlot,
  settings: Settings,
  status: PrayedStatus | undefined,
  now = new Date(),
): Promise<void> {
  const at = status && prayedAt(slot, status, now);
  if (!settings.reminders.enabled) {
    await writeLocalPrayed(slot.date, slot.key, at && status ? { at: at.toISOString(), status } : undefined);
  } else {
    const { listName } = settings.reminders;
    const write = () => setPrayerCompleted(listName, slot.id, Boolean(status), at, status);
    let found = await write();
    if (!found) {
      if (slot.date < toDateKey(new Date())) await createPastReminder(slot, settings);
      else await syncReminders(settings, new Date(), true);
      found = await write();
    }
    if (!found) throw new Error(`No reminder for ${slot.name} on ${slot.date} in "${listName}"`);
  }
  if (status) await clearSnoozes(slot.id);
}

/**
 * Mark a prayer prayed (on time, late or made up by the clock), or unmark it.
 *
 * @param slot - Prayer slot.
 * @param settings - Settings.
 * @param completed - True to mark prayed.
 * @param now - When it is marked.
 */
export function setPrayed(slot: PrayerSlot, settings: Settings, completed: boolean, now = new Date()): Promise<void> {
  return setStatus(slot, settings, completed ? clockStatus(slot, now) : undefined, now);
}
