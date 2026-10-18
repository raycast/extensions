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
export const MARK_TITLES: Record<PrayedStatus, string> = {
  jamaat: "With Jamaat",
  ontime: "On Time",
  late: "Late",
  madeup: "Made Up (Qaza)",
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
 * A prayer's status: the written one when valid, otherwise from the clock: on time if completed before the
 * late boundary, late after it, and missed once its time has ended unmarked.
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
  if (isCompleted) return !completedAt || completedAt < slot.late ? "ontime" : "late";
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
 * The status a plain "mark prayed" records: on time before the late boundary, late after it.
 *
 * @param slot - Prayer slot.
 * @param now - When it is marked.
 * @returns On time or late.
 */
export function clockStatus(slot: PrayerSlot, now: Date): "ontime" | "late" {
  return now < slot.late ? "ontime" : "late";
}

/**
 * When the prayer was prayed, recorded as the reminder's completion date, for a mark made at `now`:
 * - on time: now while it is still on time, else the jamaat if that was before the late boundary, else the start;
 * - with jamaat: the jamaat once it has happened, else as on time;
 * - late: now once it is late, else the late boundary;
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
      return now > slot.late ? now : slot.late;
    case "madeup":
      return now;
  }
}

/**
 * The statuses a started prayer can be marked or changed to, besides a plain "mark prayed" (which records
 * {@link clockStatus}) and unmark. With jamaat once its jamaat has happened, or any time when it has no jamaat
 * time set (many never set one for Maghrib); made up only after the
 * prayer's time has ended.
 *
 * @param slot - Prayer slot, already started.
 * @param current - Its prayed status, or undefined when unmarked.
 * @param now - Current instant.
 * @returns Statuses to offer, in display order.
 */
export function markOptions(slot: PrayerSlot, current: PrayerStatusValue | undefined, now: Date): PrayedStatus[] {
  const prayed = current && current !== "missed";
  const options: PrayedStatus[] = [];
  if (!slot.jamaat || slot.jamaat <= now) options.push("jamaat");
  options.push("ontime", "late");
  if (now >= slot.end) options.push("madeup");
  return options.filter((status) => status !== (prayed ? current : clockStatus(slot, now)));
}
