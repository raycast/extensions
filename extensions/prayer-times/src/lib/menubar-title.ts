import { PrayerSlot } from "./prayers";
import { AlertWindows, MenuBarState } from "./state";

const MINUTE = 60_000;

/**
 * Where a prayer's time stands, which colors the masjid before the menu bar text: dark green from the
 * start, light green shortly before the preferred end, yellow after it, red once it is ending soon.
 */
export type Period = "notStarted" | "darkGreen" | "lightGreen" | "yellow" | "red";

/** Words for each period, for the dropdown row. */
export const PERIOD_LABELS: Record<Period, string> = {
  notStarted: "Not started",
  darkGreen: "Dark green",
  lightGreen: "Light green",
  yellow: "Yellow",
  red: "Red",
};

/** The minute settings the periods use. */
type PeriodWindows = Pick<AlertWindows, "preferredReminderMinutes" | "endingReminderMinutes">;

/**
 * Where the periods change, each kept inside the prayer. A school's earlier preferred end always stands:
 * yellow from it to the end, and red only from ending soon (`end − endingReminderMinutes`) when that comes
 * later. Without one, the preferred time ends at ending soon: no yellow, red from then (all of a prayer
 * shorter than the ending-soon minutes). Light green starts `preferredReminderMinutes` before the preferred end.
 *
 * @param slot - Prayer slot.
 * @param windows - Minute settings.
 * @returns The boundaries; `red` is undefined when it stays yellow to the end.
 */
export function periodBounds(slot: PrayerSlot, windows: PeriodWindows) {
  const start = slot.start.getTime();
  const end = slot.end.getTime();
  const soon = Math.max(start, end - windows.endingReminderMinutes * MINUTE);
  const hasPreferred = slot.preferredEnd !== undefined && slot.preferredEnd.getTime() < end;
  const preferred = hasPreferred ? Math.max(start, slot.preferredEnd!.getTime()) : soon;
  const red = !hasPreferred || soon > preferred ? soon : undefined;
  return {
    preferred: new Date(preferred),
    lightGreen: new Date(Math.max(start, preferred - windows.preferredReminderMinutes * MINUTE)),
    red: red === undefined ? undefined : new Date(red),
    /** The school has a preferred end before the end. */
    hasPreferred,
  };
}

/**
 * The period a prayer is in.
 *
 * @param slot - Prayer slot.
 * @param now - Current instant.
 * @param windows - Minute settings.
 * @returns The period.
 */
export function periodAt(slot: PrayerSlot, now: Date, windows: PeriodWindows): Period {
  if (now < slot.start) return "notStarted";
  const bounds = periodBounds(slot, windows);
  if (bounds.red && now >= bounds.red) return "red";
  if (bounds.hasPreferred && now >= bounds.preferred) return "yellow";
  if (now >= bounds.lightGreen) return "lightGreen";
  return "darkGreen";
}

/** What the countdown is to, in the order they come. */
export type CountdownKind = "start" | "jamaat" | "preferredEnd" | "soon" | "end";

/** Menu bar words for each countdown, e.g. "Dhuhr Pref. ends 8m". */
const TITLE_LABELS: Record<CountdownKind, string> = {
  start: "Starts",
  jamaat: "Jamaat",
  preferredEnd: "Pref. ends",
  soon: "Ending soon",
  end: "Ends",
};

/** Dropdown words for each countdown, e.g. "preferred ends in 8m". */
const ROW_LABELS: Record<CountdownKind, string> = {
  start: "starts",
  jamaat: "jamaat",
  preferredEnd: "preferred ends",
  soon: "ending soon",
  end: "ends",
};

/**
 * The next thing to count down to: the start, jamaat, the school's preferred end, ending soon (only when
 * it turns red there), then the end.
 *
 * @param slot - Prayer slot.
 * @param now - Current instant.
 * @param windows - Minute settings.
 * @returns The countdown; the end once nothing else is ahead.
 */
export function countdownTo(slot: PrayerSlot, now: Date, windows: PeriodWindows): { at: Date; kind: CountdownKind } {
  const bounds = periodBounds(slot, windows);
  const targets: { at: Date; kind: CountdownKind }[] = [
    { at: slot.start, kind: "start" },
    ...(slot.jamaat ? [{ at: slot.jamaat, kind: "jamaat" as const }] : []),
    ...(bounds.hasPreferred ? [{ at: bounds.preferred, kind: "preferredEnd" as const }] : []),
    ...(bounds.red ? [{ at: bounds.red, kind: "soon" as const }] : []),
    { at: slot.end, kind: "end" },
  ];
  // A late jamaat (e.g. end-5) can come after the preferred end or ending soon: count to whichever is nearer.
  targets.sort((a, b) => a.at.getTime() - b.at.getTime());
  return targets.find((target) => target.at > now) ?? { at: slot.end, kind: "end" };
}

/** What the menu bar shows: the text and the masjid's color. */
export interface MenuBarTitle {
  text: string;
  tone: Period;
}

/**
 * A duration as `15m` under an hour, `1h 05m` from an hour up.
 *
 * @param ms - Non-negative duration.
 * @param round - `ceil` for countdowns (4m30s left shows 5m), `floor` for elapsed time.
 * @returns Formatted duration.
 */
export function formatMinutes(ms: number, round: "ceil" | "floor"): string {
  const minutes = Math.max(0, round === "ceil" ? Math.ceil(ms / MINUTE) : Math.floor(ms / MINUTE));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

/** A moment in a prayer's time that the menu bar and root search count down to. */
export type MomentKind = "start" | "jamaat" | "preferredEnd" | "late" | "end";

/**
 * The next moment to count down to: the start, then the jamaat, the preferred end, the late boundary and
 * the end, whichever comes first after `now`. Moments at the same time count as the end, then as late.
 *
 * @param slot - Prayer slot.
 * @param now - Current instant.
 * @returns The moment.
 */
export function nextMoment(slot: PrayerSlot, now: Date): { at: Date; kind: MomentKind } {
  const moments: { at: Date; kind: MomentKind }[] = [
    { at: slot.start, kind: "start" },
    ...(slot.jamaat ? [{ at: slot.jamaat, kind: "jamaat" as const }] : []),
    { at: slot.end, kind: "end" },
    { at: slot.late, kind: "late" },
    ...(slot.preferredEnd ? [{ at: slot.preferredEnd, kind: "preferredEnd" as const }] : []),
  ];
  moments.sort((a, b) => a.at.getTime() - b.at.getTime()); // stable: ties keep the order above
  return moments.find((moment) => moment.at > now) ?? moments[moments.length - 1];
}

/**
 * Menu bar text: the prayer, what it counts down to and the time left, e.g. `Dhuhr Pref. ends 8m`. The
 * masjid's color is the prayer's period.
 *
 * @param state - What the menu bar shows.
 * @param now - Current instant.
 * @param windows - Minute settings.
 * @returns Text and color.
 */
export function menuBarTitle(state: MenuBarState, now: Date, windows: PeriodWindows): MenuBarTitle {
  const { slot } = state;
  const countdown = countdownTo(slot, now, windows);
  const left = formatMinutes(countdown.at.getTime() - now.getTime(), "ceil");
  return { text: `${slot.name} ${TITLE_LABELS[countdown.kind]} ${left}`, tone: periodAt(slot, now, windows) };
}

/**
 * The dropdown subtitle for the menu bar's prayer: its period in words and the countdown, e.g.
 * `Light green · preferred ends in 8m`.
 *
 * @param state - What the menu bar shows.
 * @param now - Current instant.
 * @param windows - Minute settings.
 * @returns Subtitle.
 */
export function periodSubtitle(state: MenuBarState, now: Date, windows: PeriodWindows): string {
  const countdown = countdownTo(state.slot, now, windows);
  const left = formatMinutes(countdown.at.getTime() - now.getTime(), "ceil");
  return `${PERIOD_LABELS[periodAt(state.slot, now, windows)]} · ${ROW_LABELS[countdown.kind]} in ${left}`;
}
