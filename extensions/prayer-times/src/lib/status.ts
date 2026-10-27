import { PrayerSlot } from "./prayers";

/**
 * How a prayer was prayed. Written as a `prayer-status: <value>` line in the reminder's notes, second to
 * last above the key, and shared with the phone app and the Unify bridge. `late` is still within the
 * prayer's time (after its late boundary); `madeup` is qaza, prayed after its time ended.
 */
export type PrayerStatusValue = "jamaat" | "ontime" | "late" | "missed" | "madeup";

/** A status that marks the prayer prayed. */
export type PrayedStatus = Exclude<PrayerStatusValue, "missed">;

export const PRAYER_STATUSES: readonly PrayerStatusValue[] = ["jamaat", "ontime", "late", "missed", "madeup"];

/** Action wording per prayed status: "Mark …" / "Change to …". */
export const MARK_TITLES: Record<PrayerStatusValue, string> = {
  jamaat: "With Jamaat",
  ontime: "On Time",
  late: "Late",
  madeup: "Made Up (Qaza)",
  missed: "Missed",
};

/** Short label per status, for lists and the menu bar; the same wording as the phone and watch app. */
export const STATUS_LABELS: Record<PrayerStatusValue, string> = {
  jamaat: "With jamaat",
  ontime: "On time",
  late: "Late",
  missed: "Missed",
  madeup: "Made up (qaza)",
};

/**
 * A known status value, read leniently (trimmed, any case).
 *
 * @param text - Value as written.
 * @returns The status, or undefined for a missing or unknown value.
 */
export function parseStatus(text: string | null | undefined): PrayerStatusValue | undefined {
  const value = text?.trim().toLowerCase();
  return PRAYER_STATUSES.find((status) => status === value);
}

/**
 * A written status counts only when it agrees with the reminder: `missed` exactly when it isn't completed.
 * A line left behind (e.g. after ticking the reminder in the Reminders app) is ignored, not cleaned up.
 *
 * @param text - Value as written.
 * @param isCompleted - Whether the reminder is completed.
 * @returns The status, or undefined when missing, unknown or stale.
 */
export function validStatus(text: string | null | undefined, isCompleted: boolean): PrayerStatusValue | undefined {
  const status = parseStatus(text);
  return status && (status === "missed") === !isCompleted ? status : undefined;
}

/**
 * A prayer's status: the written one when valid, otherwise from the clock ({@link clockStatus} at its
 * completion time), and missed once its time has ended unmarked.
 *
 * @param slot - Prayer slot.
 * @param isCompleted - Whether it is marked prayed.
 * @param completedAt - Completion time.
 * @param written - The `prayer-status:` value, if any.
 * @param now - Current instant.
 * @returns The status, or undefined while an unmarked prayer's time is still running.
 */
export function statusOf(
  slot: PrayerSlot,
  isCompleted: boolean,
  completedAt: Date | undefined,
  written: string | null | undefined,
  now: Date,
): PrayerStatusValue | undefined {
  const valid = validStatus(written, isCompleted);
  if (valid) return valid;
  if (isCompleted) return completedAt ? clockStatus(slot, completedAt) : "ontime";
  return now >= slot.end ? "missed" : undefined;
}

/**
 * Whether a status counts as prayed on time in the stats.
 *
 * @param status - Status.
 * @returns True for jamaat and on time.
 */
export function countsOnTime(status: PrayerStatusValue | undefined): boolean {
  return status === "jamaat" || status === "ontime";
}

/**
 * The status the clock gives a prayer prayed at `at`: on time before the late boundary, late after it while
 * its time lasts, made up (qaza) once its time has ended. A plain "mark prayed" records this.
 *
 * @param slot - Prayer slot.
 * @param at - When it was prayed.
 * @returns On time, late or made up.
 */
export function clockStatus(slot: PrayerSlot, at: Date): "ontime" | "late" | "madeup" {
  if (at < slot.late) return "ontime";
  return at < slot.end ? "late" : "madeup";
}

/**
 * When the prayer was prayed, recorded as the reminder's completion date, for a mark made at `now`:
 * - on time: now while it is still on time, else the jamaat if that was before the late boundary, else the start;
 * - with jamaat: the jamaat once it has happened, else as on time;
 * - late: now once it is late, else the late boundary, but no later than a minute before the end, so it
 *   still reads as late from the time alone;
 * - made up: now.
 *
 * @param slot - Prayer slot.
 * @param status - Status being marked.
 * @param now - When it is marked.
 * @returns Completion time.
 */
export function prayedAt(slot: PrayerSlot, status: PrayedStatus, now: Date): Date {
  switch (status) {
    case "jamaat":
      return slot.jamaat && slot.jamaat <= now ? slot.jamaat : prayedAt(slot, "ontime", now);
    case "ontime":
      if (now < slot.late) return now;
      return slot.jamaat && slot.jamaat < slot.late ? slot.jamaat : slot.start;
    case "late":
      return new Date(Math.min(Math.max(now.getTime(), slot.late.getTime()), slot.end.getTime() - 60_000));
    case "madeup":
      return now;
  }
}

/**
 * The statuses a started prayer can be marked or changed to, besides a plain "mark prayed" (which records
 * {@link clockStatus}) and unmark. With jamaat once its jamaat has happened, or any time when it has no jamaat
 * time set (many never set one for Maghrib); made up and missed only after the prayer's time has ended.
 * An unmarked prayer already counts as missed once its time ends; marking it missed writes that down.
 *
 * @param slot - Prayer slot, already started.
 * @param current - Its status (missed included), or undefined while unmarked and running.
 * @param now - Current instant.
 * @returns Statuses to offer, in display order.
 */
export function markOptions(slot: PrayerSlot, current: PrayerStatusValue | undefined, now: Date): PrayerStatusValue[] {
  const prayed = current && current !== "missed";
  const options: PrayerStatusValue[] = [];
  if (!slot.jamaat || slot.jamaat <= now) options.push("jamaat");
  options.push("ontime", "late");
  if (now >= slot.end) options.push("madeup", "missed");
  // An unprayed prayer's plain "Mark as Prayed" already records the clock's status.
  return options.filter((status) => status !== current && (prayed || status !== clockStatus(slot, now)));
}
