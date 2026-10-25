import { RTL_SCRIPT } from "./format";
import { PrayerSlot } from "./prayers";
import { MenuBarState } from "./state";

const MINUTE = 60_000;

/** Color of the masjid before the menu bar text: what it counts down to. */
export type TitleTone = "white" | "darkGreen" | "yellow" | "red";

/** start → white, jamaat → dark green, preferred end → yellow, end → red. */
const MOMENT_TONES: Record<MomentKind, TitleTone> = {
  start: "white",
  jamaat: "darkGreen",
  preferredEnd: "yellow",
  // The late boundary is the preferred end (Counts as Late After = Preferred), or the end itself.
  late: "yellow",
  end: "red",
};

/** What the menu bar shows: the text and its color. */
export interface MenuBarTitle {
  text: string;
  tone: TitleTone;
}

/**
 * Minutes as `5` under an hour, `01:05` (four digits) from an hour up.
 *
 * @param ms - Non-negative duration.
 * @param round - `ceil` for countdowns (4m30s left shows 5), `floor` for elapsed time.
 * @returns Formatted minutes.
 */
export function formatMinutes(ms: number, round: "ceil" | "floor"): string {
  const minutes = round === "ceil" ? Math.ceil(ms / MINUTE) : Math.floor(ms / MINUTE);
  if (minutes < 60) return String(Math.max(0, minutes));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
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
 * Menu bar text: only the time left until the prayer's next moment ({@link nextMoment}):
 *
 * - `Asr -5`     5 minutes until Asr starts
 * - `Asr -5`     5 minutes until Asr jamaat
 * - `Asr (-40)`  40 minutes until Asr's next end: its preferred end, the moment it becomes late, or its end
 *
 * The icon color says what it counts down to: white to the start, dark green to jamaat, yellow to the
 * preferred end, red to the end.
 *
 * @param state - What the menu bar shows.
 * @param now - Current instant.
 * @returns Text and color.
 */
export function menuBarTitle(state: MenuBarState, now: Date): MenuBarTitle {
  const { slot } = state;
  const moment = nextMoment(slot, now);
  const ms = moment.at.getTime() - now.getTime();
  const minutes = formatMinutes(ms, "ceil");
  const bracket = moment.kind !== "start" && moment.kind !== "jamaat";
  return {
    text: RTL_SCRIPT.test(slot.name)
      ? // Raycast strips the left-to-right marks from menu bar titles, so an Arabic name makes macOS lay the
        // title out right to left. Written in reverse order, it then reads "فجر -17" / "فجر (-17)".
        `${bracket ? `(${minutes}-)` : `${minutes}-`} ${slot.name}`
      : `${slot.name} ${bracket ? `(-${minutes})` : `-${minutes}`}`,
    tone: MOMENT_TONES[moment.kind],
  };
}
