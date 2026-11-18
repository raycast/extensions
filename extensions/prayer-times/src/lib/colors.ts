import type { DayTone } from "./calendar";
import type { PrayerStatusValue } from "./status";

/** A color for Raycast's light and dark appearance. */
export interface Hex {
  light: string;
  dark: string;
}

/**
 * Status colors shared by Today's Prayers, the menu bar and Prayer Calendar (its list and its drawn panel).
 * Late, made up and not started are the phone app's ink tokens (design/tokens/themes.json).
 */
export const STATUS_HEX: Record<PrayerStatusValue, Hex> = {
  jamaat: { light: "#34C759", dark: "#30D158" },
  ontime: { light: "#34C759", dark: "#30D158" },
  late: { light: "#2D8949", dark: "#83DC97" },
  madeup: { light: "#AA7E00", dark: "#F3D350" },
  missed: { light: "#FF3B30", dark: "#FF453A" },
};

/** Prayers not started yet, or with no record: grey with no tint, so it never reads as light green. */
export const NOT_STARTED_HEX: Hex = { light: "#868686", dark: "#7A7A7A" };

/** Day colors (its worst status, or grey), shared by Today's last days and the calendar. */
export const TONE_HEX: Record<DayTone, Hex> = {
  ontime: STATUS_HEX.ontime,
  late: STATUS_HEX.late,
  madeup: STATUS_HEX.madeup,
  missed: STATUS_HEX.missed,
  noData: NOT_STARTED_HEX,
  future: NOT_STARTED_HEX,
};
