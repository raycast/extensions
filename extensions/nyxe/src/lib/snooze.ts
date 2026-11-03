/**
 * Snooze presets, computed in the local time zone — the same three the Nyxe
 * reader offers, so a thread snoozed from Raycast wakes when the user expects.
 */

export interface SnoozePreset {
  id: "later-today" | "tomorrow" | "next-week";
  title: string;
  wakeAt: number;
}

const HOUR = 60 * 60 * 1000;

/** Local 8:00 on `date`'s day. */
function atEight(date: Date): Date {
  const d = new Date(date);
  d.setHours(8, 0, 0, 0);
  return d;
}

/**
 * - Later today: three hours from now, rounded up to the hour — offered only
 *   while that is still today (and before 21:00, so it isn't "later tonight").
 * - Tomorrow 8:00.
 * - Next week: the coming Monday at 8:00 (a week out when today is Monday).
 */
export function snoozePresets(now: Date = new Date()): SnoozePreset[] {
  const presets: SnoozePreset[] = [];

  const later = new Date(now.getTime() + 3 * HOUR);
  if (later.getMinutes() !== 0 || later.getSeconds() !== 0 || later.getMilliseconds() !== 0) {
    later.setHours(later.getHours() + 1, 0, 0, 0);
  }
  if (later.getDate() === now.getDate() && later.getHours() <= 21) {
    presets.push({ id: "later-today", title: "Later Today", wakeAt: later.getTime() });
  }

  const tomorrow = atEight(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  presets.push({ id: "tomorrow", title: "Tomorrow 8:00", wakeAt: tomorrow.getTime() });

  const monday = atEight(now);
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  monday.setDate(monday.getDate() + daysUntilMonday);
  presets.push({ id: "next-week", title: "Next Week (Mon 8:00)", wakeAt: monday.getTime() });

  return presets;
}
