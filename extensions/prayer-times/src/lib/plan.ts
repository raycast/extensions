import { addDays, getDaySchedule, PrayerSlot, ScheduleConfig } from "./prayers";
import { AlertWindows } from "./state";
import { formatTime } from "./format";

const MINUTE = 60_000;

/** How reminders are timed. */
export interface PlanOptions {
  /** Reminder due time: prayer start, or jamaat when the prayer has one. */
  dueAt: "start" | "jamaat";
  /** Extra notification this many minutes before the due time; 0 for none. */
  headsUpMinutes: number;
  windows: AlertWindows;
  /** Days to keep filled, starting today. */
  days: number;
}

/** One reminder as sent to the Swift helper. Field names match its `PlannedReminder`. */
export interface PlannedReminder {
  key: string;
  title: string;
  due: string;
  alarms: string[];
  notes: string;
}

/**
 * Notification times for a slot: heads-up, start, before jamaat, before the end.
 * Deduplicated to the minute and sorted. Past times are kept here; the helper drops them.
 *
 * @param slot - Prayer slot.
 * @param due - Reminder due time.
 * @param options - Plan options.
 * @returns Alarm instants.
 */
export function alarmTimes(slot: PrayerSlot, due: Date, options: PlanOptions): Date[] {
  const { windows } = options;
  const times: Date[] = [slot.start];
  if (options.headsUpMinutes > 0) times.push(new Date(due.getTime() - options.headsUpMinutes * MINUTE));
  if (slot.jamaat && windows.jamaatReminderMinutes > 0) {
    times.push(new Date(slot.jamaat.getTime() - windows.jamaatReminderMinutes * MINUTE));
  }
  if (windows.endingReminderMinutes > 0) {
    const ending = new Date(slot.end.getTime() - windows.endingReminderMinutes * MINUTE);
    if (ending > slot.start) times.push(ending);
  }
  const unique = new Map(times.map((time) => [Math.round(time.getTime() / MINUTE), time]));
  return [...unique.values()].sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Build the reminders for today and the following days.
 *
 * @param now - Any instant on the first day.
 * @param schedule - Schedule configuration.
 * @param options - Plan options.
 * @returns Reminders in date and prayer order.
 */
export function planReminders(now: Date, schedule: ScheduleConfig, options: PlanOptions): PlannedReminder[] {
  const plan: PlannedReminder[] = [];
  for (let offset = 0; offset < options.days; offset++) {
    for (const slot of getDaySchedule(addDays(now, offset), schedule)) {
      const due = options.dueAt === "jamaat" && slot.jamaat ? slot.jamaat : slot.start;
      const notes = [
        `${slot.name} starts ${formatTime(slot.start)}`,
        slot.jamaat ? `Jamaat ${formatTime(slot.jamaat)}` : undefined,
        `Ends ${formatTime(slot.end)}`,
      ]
        .filter(Boolean)
        .join(" · ")
        // Last line is the key; iCloud Reminders drops EKReminder.url, notes persist.
        .concat(`\nprayer-times://${slot.id}`);
      plan.push({
        key: slot.id,
        title: slot.name,
        due: due.toISOString(),
        alarms: alarmTimes(slot, due, options).map((time) => time.toISOString()),
        notes,
      });
    }
  }
  return plan;
}

/**
 * Cheap fingerprint of a plan, so the helper only runs when something changed.
 *
 * @param plan - Planned reminders.
 * @returns Hash string.
 */
export function planHash(plan: PlannedReminder[]): string {
  const text = JSON.stringify(plan);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${plan.length}:${(hash >>> 0).toString(16)}`;
}
