import { ltrName } from "./format";
import { AlertWindows, MenuBarState } from "./state";

const MINUTE = 60_000;

/** Color of the minaret (or mosque) before the menu bar text. */
export type TitleTone = "plain" | "yellow" | "green" | "blue" | "red";

/** What the menu bar shows: the text, its color, and whether the mosque replaces the dot. */
export interface MenuBarTitle {
  text: string;
  tone: TitleTone;
  /** True while counting to or just past jamaat: the mosque replaces the minaret. */
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

/**
 * Menu bar text in the countdown format:
 *
 * - `Asr -5`    5 minutes until Asr starts
 * - `Asr +5`    5 minutes since Asr started
 * - 🕌 `Asr -5` 5 minutes until Asr jamaat (`+2` just after it)
 * - `Asr (-5)`  5 minutes left in Asr's time (red)
 *
 * @param state - What the menu bar shows.
 * @param now - Current instant.
 * @param windows - Minute settings (start window and heads-up decide some colors).
 * @returns Text, color and whether to show the mosque.
 */
export function menuBarTitle(state: MenuBarState, now: Date, windows: AlertWindows): MenuBarTitle {
  const { slot, kind } = state;
  const t = now.getTime();
  switch (kind) {
    case "upcoming": {
      const left = slot.start.getTime() - t;
      const soon = windows.headsUpMinutes > 0 && left <= windows.headsUpMinutes * MINUTE;
      return {
        text: `${ltrName(slot.name)} -${formatMinutes(left, "ceil")}`,
        tone: soon ? "yellow" : "plain",
        mosque: false,
      };
    }
    case "start":
    case "pending":
      return {
        text: `${ltrName(slot.name)} +${formatMinutes(t - slot.start.getTime(), "floor")}`,
        tone: kind === "start" ? "green" : "blue",
        mosque: false,
      };
    case "jamaat": {
      const jamaat = slot.jamaat?.getTime() ?? t;
      const text =
        jamaat > t
          ? `${ltrName(slot.name)} -${formatMinutes(jamaat - t, "ceil")}`
          : `${ltrName(slot.name)} +${formatMinutes(t - jamaat, "floor")}`;
      return { text, tone: "green", mosque: true };
    }
    case "ending":
      return {
        text: `${ltrName(slot.name)} (-${formatMinutes(slot.end.getTime() - t, "ceil")})`,
        tone: "red",
        mosque: false,
      };
  }
}
