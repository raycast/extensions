import { Color, Icon } from "@raycast/api";
import { getHourForTz } from "./getHourForTz";

export type HourStatusKind = "asleep" | "waking" | "working" | "evening";

export interface HourStatus {
  kind: HourStatusKind;
  /** Raycast tag/accessory colour. */
  color: Color;
  /** Raycast accessory icon. */
  icon: Icon;
  /** Coloured block used to render hour bands in markdown. */
  block: string;
  /** Short label for the metadata panel. */
  label: string;
  /** Longer, friendly tooltip. */
  tooltip: string;
  /** Whether this is a sensible hour to reach out. */
  isGood: boolean;
}

/**
 * Single source of truth for how an hour of the day is interpreted.
 *
 * The whole extension (tag colours, icons, tooltips, the detail-pane hour
 * band and the overlap finder) derives its behaviour from this function so
 * the thresholds only ever live in one place.
 *
 * Bands:
 *   23:00-07:59  asleep   (red / 🟥)
 *   08:00-08:59  waking   (yellow / 🟨)
 *   09:00-18:59  working  (green / 🟩)  <- the "good time to reach out" window
 *   19:00-22:59  evening  (yellow / 🟨)
 */
export function statusForHour(hour: number): HourStatus {
  if (hour >= 9 && hour <= 18) {
    return {
      kind: "working",
      color: Color.Green,
      icon: Icon.Emoji,
      block: "🟩",
      label: "Working hours",
      tooltip: "It's a good time to reach out",
      isGood: true,
    };
  }

  if (hour >= 8 && hour < 9) {
    return {
      kind: "waking",
      color: Color.Yellow,
      icon: Icon.Warning,
      block: "🟨",
      label: "Starting the day",
      tooltip: "It's early, they might be busy",
      isGood: false,
    };
  }

  if (hour >= 19 && hour < 23) {
    return {
      kind: "evening",
      color: Color.Yellow,
      icon: Icon.Warning,
      block: "🟨",
      label: "Evening",
      tooltip: "It's getting late, they might be busy",
      isGood: false,
    };
  }

  // 23:00-04:59 and 05:00-07:59 both read as "asleep" for colour/icon, but we
  // keep a softer tooltip for the early-morning stretch.
  return {
    kind: "asleep",
    color: Color.Red,
    icon: Icon.Moon,
    block: "🟥",
    label: hour >= 5 && hour <= 7 ? "Early morning" : "Asleep",
    tooltip: hour >= 5 && hour <= 7 ? "It's early, they might be sleeping" : "It's late, they might be sleeping",
    isGood: false,
  };
}

export function getHourStatus(tz: string, offsetHrs?: number): HourStatus {
  return statusForHour(getHourForTz(tz, offsetHrs));
}
