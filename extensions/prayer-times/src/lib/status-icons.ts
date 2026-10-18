import { Color, Icon, Image } from "@raycast/api";
import { PrayerStatusValue } from "./status";

const ICONS: Record<PrayerStatusValue, Icon> = {
  jamaat: Icon.TwoPeople,
  ontime: Icon.CheckCircle,
  late: Icon.CheckCircle,
  madeup: Icon.ArrowCounterClockwise,
  missed: Icon.XMarkCircle,
};

/** Late is an olive green (still prayed in its time); Raycast has only one green. */
const LATE_GREEN: Color.Dynamic = { light: "#5E7F1A", dark: "#A4C639", adjustContrast: true };

export const STATUS_COLORS: Record<PrayerStatusValue, Color.ColorLike> = {
  jamaat: Color.Green,
  ontime: Color.Green,
  late: LATE_GREEN,
  madeup: Color.Orange,
  missed: Color.Red,
};

/**
 * Tinted icon for a prayer status, shared by Today's Prayers and the menu bar.
 *
 * @param status - Status.
 * @returns Icon.
 */
export function statusIcon(status: PrayerStatusValue): Image.ImageLike {
  return { source: ICONS[status], tintColor: STATUS_COLORS[status] };
}
