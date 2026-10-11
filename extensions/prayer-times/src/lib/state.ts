import { PrayerSlot } from "./prayers";

const MINUTE = 60_000;

/** The moments a prayer can alert for. */
export type AlertKind = "headsUp" | "start" | "jamaat" | "ending";

/** Minute settings that decide when alerts fire and how long the menu bar shows them. */
export interface AlertWindows {
  /** Menu bar stays this long after a prayer starts. */
  startWindowMinutes: number;
  /** Alert this long before jamaat; menu bar shows from then until 5 minutes after jamaat. */
  jamaatReminderMinutes: number;
  /** Alert this long before the prayer time ends; menu bar shows until it ends or is prayed. */
  endingReminderMinutes: number;
  /** Heads-up this long before the due time; 0 for none. Not shown in the menu bar. */
  headsUpMinutes: number;
  /** What the heads-up counts down to: the start, or jamaat when the prayer has one. */
  dueAt: "start" | "jamaat";
}

/** A single alert occurrence for a slot. */
export interface PrayerAlert {
  /** `slotId:kind`, unique per day. */
  id: string;
  slot: PrayerSlot;
  kind: AlertKind;
  /** When the alert should fire. */
  at: Date;
  /** After this the alert is stale and is skipped (e.g. the Mac was asleep). */
  expires: Date;
}

/** What the menu bar should show right now. */
export interface MenuBarState {
  slot: PrayerSlot;
  /**
   * `start`, `jamaat`, `ending`: alert windows. `pending`: running, not prayed, no window.
   * `upcoming`: the next prayer.
   */
  kind: Exclude<AlertKind, "headsUp"> | "pending" | "upcoming";
}

const JAMAAT_GRACE = 5 * MINUTE;

/**
 * Build the alerts a slot can produce.
 *
 * @param slot - Prayer slot.
 * @param windows - Minute settings.
 * @returns Alerts in firing order.
 */
/**
 * What a prayer's heads-up counts down to: jamaat when reminders are due at jamaat and the prayer has
 * one, otherwise the prayer start.
 *
 * @param slot - Prayer slot.
 * @param dueAt - When reminders are due.
 * @returns The instant the heads-up is for.
 */
export function headsUpDue(slot: PrayerSlot, dueAt: AlertWindows["dueAt"]): Date {
  return dueAt === "jamaat" && slot.jamaat ? slot.jamaat : slot.start;
}

export function alertsForSlot(slot: PrayerSlot, windows: AlertWindows): PrayerAlert[] {
  const alerts: PrayerAlert[] = [];
  if (windows.headsUpMinutes > 0) {
    const due = headsUpDue(slot, windows.dueAt);
    alerts.push({
      id: `${slot.id}:headsUp`,
      slot,
      kind: "headsUp",
      at: new Date(due.getTime() - windows.headsUpMinutes * MINUTE),
      expires: due,
    });
  }
  alerts.push({
    id: `${slot.id}:start`,
    slot,
    kind: "start",
    at: slot.start,
    expires: new Date(slot.start.getTime() + Math.max(windows.startWindowMinutes, 1) * MINUTE),
  });
  if (slot.jamaat) {
    const at = new Date(slot.jamaat.getTime() - windows.jamaatReminderMinutes * MINUTE);
    alerts.push({
      id: `${slot.id}:jamaat`,
      slot,
      kind: "jamaat",
      at: at < slot.start ? slot.start : at,
      expires: slot.jamaat,
    });
  }
  const endingAt = new Date(slot.end.getTime() - windows.endingReminderMinutes * MINUTE);
  if (endingAt > slot.start) {
    alerts.push({ id: `${slot.id}:ending`, slot, kind: "ending", at: endingAt, expires: slot.end });
  }
  return alerts.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Alerts that should fire now and haven't fired yet.
 *
 * Heads-up and start alerts always fire. Jamaat and ending alerts are skipped once the prayer is marked prayed.
 * Only the latest due alert per slot is returned, so waking from sleep doesn't stack three popups.
 *
 * @param slots - Timeline slots.
 * @param now - Current instant.
 * @param prayed - Slot ids marked prayed.
 * @param fired - Alert ids already fired.
 * @param windows - Minute settings.
 * @returns Alerts to deliver, oldest first.
 */
export function dueAlerts(
  slots: PrayerSlot[],
  now: Date,
  prayed: ReadonlySet<string>,
  fired: ReadonlySet<string>,
  windows: AlertWindows,
): PrayerAlert[] {
  const due: PrayerAlert[] = [];
  for (const slot of slots) {
    const live = alertsForSlot(slot, windows).filter(
      (alert) =>
        alert.at <= now &&
        now < alert.expires &&
        !((alert.kind === "jamaat" || alert.kind === "ending") && prayed.has(slot.id)),
    );
    const latest = live[live.length - 1];
    if (latest && !fired.has(latest.id)) due.push(latest);
  }
  return due;
}

/**
 * The alert ids that are due or already past for a slot, used to mark skipped alerts as fired
 * so an older alert doesn't fire after a newer one.
 *
 * @param slot - Prayer slot.
 * @param now - Current instant.
 * @param windows - Minute settings.
 * @returns Ids of alerts whose time has come.
 */
export function passedAlertIds(slot: PrayerSlot, now: Date, windows: AlertWindows): string[] {
  return alertsForSlot(slot, windows)
    .filter((alert) => alert.at <= now)
    .map((alert) => alert.id);
}

/**
 * The slot whose time is running at `now`, if any.
 *
 * @param slots - Timeline slots.
 * @param now - Current instant.
 * @returns Current slot, or undefined between sunrise and Dhuhr and similar gaps.
 */
export function currentSlot(slots: PrayerSlot[], now: Date): PrayerSlot | undefined {
  return slots.find((slot) => slot.start <= now && now < slot.end);
}

/**
 * The latest prayer that has started. Its turn lasts until the next prayer starts, which for Fajr
 * runs past sunrise (until Dhuhr) and for Isha past midnight (until Fajr).
 *
 * @param slots - Timeline slots, sorted by start.
 * @param now - Current instant.
 * @returns Active slot.
 */
export function activeSlot(slots: PrayerSlot[], now: Date): PrayerSlot | undefined {
  let active: PrayerSlot | undefined;
  for (const slot of slots) if (slot.start <= now) active = slot;
  return active;
}

/**
 * The next slot that hasn't started yet.
 *
 * @param slots - Timeline slots.
 * @param now - Current instant.
 * @returns Next slot, if the timeline has one.
 */
export function nextSlot(slots: PrayerSlot[], now: Date): PrayerSlot | undefined {
  return slots.find((slot) => slot.start > now);
}

/**
 * Decide what the menu bar shows.
 *
 * Once a prayer starts it stays until it is marked prayed or its time ends. While shown: the jamaat
 * window wins, then the ending window, then the first minutes after start, else pending. After it's prayed, the next prayer shows as a countdown during
 * the heads-up window, or all the time with `always`.
 *
 * @param slots - Timeline slots, sorted by start.
 * @param now - Current instant.
 * @param prayed - Slot ids marked prayed.
 * @param windows - Minute settings.
 * @param always - Show the next prayer's countdown even outside the heads-up window.
 * @returns State to render, or undefined to hide the item.
 */
export function menuBarState(
  slots: PrayerSlot[],
  now: Date,
  prayed: ReadonlySet<string>,
  windows: AlertWindows,
  always: boolean,
): MenuBarState | undefined {
  const slot = activeSlot(slots, now);
  if (slot && !prayed.has(slot.id) && now < slot.end) {
    const t = now.getTime();
    if (slot.jamaat) {
      const from = slot.jamaat.getTime() - windows.jamaatReminderMinutes * MINUTE;
      if (t >= from && t < slot.jamaat.getTime() + JAMAAT_GRACE) return { slot, kind: "jamaat" };
    }
    if (t >= slot.end.getTime() - windows.endingReminderMinutes * MINUTE) return { slot, kind: "ending" };
    if (t < slot.start.getTime() + windows.startWindowMinutes * MINUTE) return { slot, kind: "start" };
    return { slot, kind: "pending" };
  }
  const next = nextSlot(slots, now);
  if (!next) return undefined;
  const inHeadsUp =
    windows.headsUpMinutes > 0 && next.start.getTime() - now.getTime() <= windows.headsUpMinutes * MINUTE;
  return always || inHeadsUp ? { slot: next, kind: "upcoming" } : undefined;
}
