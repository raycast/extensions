import { Color, Icon, Image } from "@raycast/api";
import { PrayerStatusValue } from "./status";

const ICONS: Record<PrayerStatusValue, Icon> = {
  jamaat: Icon.TwoPeople,
  ontime: Icon.CheckCircle,
  late: Icon.CheckCircle,
  madeup: Icon.ArrowCounterClockwise,
  missed: Icon.XMarkCircle,
};

export const STATUS_COLORS: Record<PrayerStatusValue, Color> = {
  jamaat: Color.Green,
  ontime: Color.Green,
  late: Color.Orange,
  madeup: Color.Purple,
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
