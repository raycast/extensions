import { Color, Icon, Image } from "@raycast/api";
import { DayTone } from "./calendar";
import { NOT_STARTED_HEX, STATUS_HEX, TONE_HEX } from "./colors";
import { PrayerStatusValue } from "./status";

/** The masjid mark inside a disc (the phone app's jamaat glyph), tinted like Raycast icons. */
const ICONS: Record<PrayerStatusValue, Image.Source> = {
  jamaat: "masjid-disc.png",
  ontime: Icon.CheckCircle,
  late: Icon.CheckCircle,
  madeup: Icon.ArrowCounterClockwise,
  missed: Icon.XMarkCircle,
};

/** Prayers not started yet, or with no record. */
export const NOT_STARTED_GREY: Color.Dynamic = { ...NOT_STARTED_HEX, adjustContrast: true };

export const STATUS_COLORS = Object.fromEntries(
  Object.entries(STATUS_HEX).map(([status, hex]) => [status, { ...hex, adjustContrast: true }]),
) as Record<PrayerStatusValue, Color.Dynamic>;

/** A day's color (its worst status, or grey), the same as the calendar's. */
export function toneColor(tone: DayTone): Color.Dynamic {
  return { ...TONE_HEX[tone], adjustContrast: true };
}

/**
 * Tinted icon for a prayer status, shared by Today's Prayers and the menu bar.
 *
 * @param status - Status.
 * @returns Icon.
 */
export function statusIcon(status: PrayerStatusValue): Image.ImageLike {
  return { source: ICONS[status], tintColor: STATUS_COLORS[status] };
}
