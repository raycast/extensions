import { Color, Icon, Image } from "@raycast/api";
import { PrayerStatusValue } from "./status";

const ICONS: Record<PrayerStatusValue, Icon> = {
  jamaat: Icon.TwoPeople,
  ontime: Icon.CheckCircle,
  late: Icon.CheckCircle,
  madeup: Icon.ArrowCounterClockwise,
  missed: Icon.XMarkCircle,
};

// Late and made up use the phone app's tokens (design/tokens/themes.json, light = classic, dark = night),
// converted from OKLCH: late oklch(52% 0.12 65) / oklch(80% 0.13 80), made up oklch(43% 0.02 175) / oklch(76% 0.015 170).
const LATE_AMBER: Color.Dynamic = { light: "#975800", dark: "#E9B452", adjustContrast: true };
const MADE_UP_GREY: Color.Dynamic = { light: "#45544F", dark: "#A8B4AF", adjustContrast: true };

export const STATUS_COLORS: Record<PrayerStatusValue, Color.ColorLike> = {
  jamaat: Color.Green,
  ontime: Color.Green,
  late: LATE_AMBER,
  madeup: MADE_UP_GREY,
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
