import { ltrName } from "./format";
import { PrayerSlot } from "./prayers";
import { AlertWindows, MenuBarState } from "./state";

const MINUTE = 60_000;

/** Color of the minaret (or mosque) before the menu bar text. */
export type TitleTone = "plain" | "yellow" | "green" | "blue" | "orange" | "red";

/** What the menu bar shows: the text, its color, and whether the mosque replaces the dot. */
export interface MenuBarTitle {
  text: string;
  tone: TitleTone;
  /** True while counting down to jamaat: the mosque replaces the minaret. */
  mosque: boolean;
}

/**
 * Minutes as `5` under an hour, `1:05` from an hour up.
 *
 * @param ms - Non-negative duration.
 * @param round - `ceil` for countdowns (4m30s left shows 5), `floor` for elapsed time.
 * @returns Formatted minutes.
 */
export function formatMinutes(ms: number, round: "ceil" | "floor"): string {
  const minutes = round === "ceil" ? Math.ceil(ms / MINUTE) : Math.floor(ms / MINUTE);
  if (minutes < 60) return String(Math.max(0, minutes));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
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
 * - 🕌 `Asr -5`  5 minutes until Asr jamaat
 * - `Asr (-40)`  40 minutes until Asr's next end: its preferred end, the moment it becomes late, or its end
 *
 * The icon color shows the state: yellow inside the heads-up, green after the start and around jamaat,
 * blue while it runs, red before it becomes late, orange in the disliked time after its preferred end.
 *
 * @param state - What the menu bar shows.
 * @param now - Current instant.
 * @param windows - Minute settings (the heads-up decides the upcoming color).
 * @returns Text, color and whether to show the mosque.
 */
export function menuBarTitle(state: MenuBarState, now: Date, windows: AlertWindows): MenuBarTitle {
  const { slot, kind } = state;
  const moment = nextMoment(slot, now);
  const ms = moment.at.getTime() - now.getTime();
  const left = `-${formatMinutes(ms, "ceil")}`;
  const name = ltrName(slot.name);
  const soon = windows.headsUpMinutes > 0 && ms <= windows.headsUpMinutes * MINUTE;
  const tones: Record<MenuBarState["kind"], TitleTone> = {
    upcoming: soon ? "yellow" : "plain",
    start: "green",
    jamaat: "green",
    pending: "blue",
    ending: "red",
    disliked: "orange",
  };
  return {
    text: moment.kind === "start" || moment.kind === "jamaat" ? `${name} ${left}` : `${name} (${left})`,
    tone: tones[kind],
    mosque: moment.kind === "jamaat",
  };
}
