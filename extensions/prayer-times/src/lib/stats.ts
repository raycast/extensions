import { PRAYER_KEYS, PrayerKey } from "./prayers";

/** Minimal per-prayer record the stats need; matches tracker's PrayerRecord. */
export interface StatRecord {
  completed: boolean;
  onTime: boolean;
}

/** Reminder records keyed by date, then prayer. A missing date means no data, not "not prayed". */
export type StatHistory = Record<string, Partial<Record<PrayerKey, StatRecord>>>;

/** Counts over a range of days. */
export interface Summary {
  /** Days in the range that have reminder data. */
  knownDays: number;
  prayed: number;
  /** Prayers on days with data. */
  total: number;
  onTime: number;
  perPrayer: Record<PrayerKey, number>;
}

/**
 * Count prayed and on-time prayers over the given dates. Days with no reminders are left out
 * of the total, since a gap in syncing isn't the same as a missed prayer.
 *
 * @param history - Reminder records.
 * @param dates - Local date keys to include.
 * @returns Totals and per-prayer counts.
 */
export function summarize(history: StatHistory, dates: string[]): Summary {
  const perPrayer = Object.fromEntries(PRAYER_KEYS.map((key) => [key, 0])) as Record<PrayerKey, number>;
  let knownDays = 0;
  let prayed = 0;
  let onTime = 0;
  for (const date of dates) {
    const day = history[date];
    if (!day || Object.keys(day).length === 0) continue;
    knownDays++;
    for (const key of PRAYER_KEYS) {
      const record = day[key];
      if (!record?.completed) continue;
      prayed++;
      perPrayer[key]++;
      if (record.onTime) onTime++;
    }
  }
  return { knownDays, prayed, total: knownDays * PRAYER_KEYS.length, onTime, perPrayer };
}

/**
 * Consecutive days, ending at the last date, where all five prayers are completed.
 *
 * @param history - Reminder records.
 * @param dates - Date keys oldest to newest.
 * @returns Streak length in days.
 */
export function fullDayStreak(history: StatHistory, dates: string[]): number {
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const day = history[dates[i]] ?? {};
    if (PRAYER_KEYS.every((key) => day[key]?.completed)) streak++;
    else break;
  }
  return streak;
}
