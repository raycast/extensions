import { Color, Icon } from "@raycast/api";
import type { Indicator } from "./providers/types";

export function indicatorColor(indicator: Indicator): Color {
  switch (indicator) {
    case "none":
      return Color.Green;
    case "minor":
      return Color.Yellow;
    case "major":
      return Color.Orange;
    case "critical":
      return Color.Red;
    case "maintenance":
      return Color.Blue;
    default:
      return Color.SecondaryText;
  }
}

export function indicatorEmoji(indicator: Indicator): string {
  switch (indicator) {
    case "none":
      return "🟢";
    case "minor":
      return "🟡";
    case "major":
      return "🟠";
    case "critical":
      return "🔴";
    case "maintenance":
      return "🔵";
    default:
      return "⚪";
  }
}

/** List/detail icon: a filled dot tinted by severity. */
export function statusIcon(indicator: Indicator): { source: Icon; tintColor: Color } {
  return { source: Icon.CircleFilled, tintColor: indicatorColor(indicator) };
}

/** True when the service is in a degraded/outage state (excludes maintenance and healthy). */
export function hasProblem(indicator: Indicator): boolean {
  return indicator === "minor" || indicator === "major" || indicator === "critical";
}

/** Emoji for a raw Statuspage component status (operational, degraded_performance, …). */
export function componentEmoji(status: string): string {
  switch (status) {
    case "operational":
      return "🟢";
    case "degraded_performance":
      return "🟡";
    case "partial_outage":
      return "🟠";
    case "major_outage":
      return "🔴";
    case "under_maintenance":
      return "🔵";
    default:
      return "⚪";
  }
}

/**
 * Human label for a raw status token: "degraded_performance" → "Degraded Performance",
 * "SERVICE_DISRUPTION" → "Service Disruption". Lowercases the tail so ALL-CAPS inputs read normally.
 */
export function humanize(raw: string): string {
  return raw
    .split("_")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

/** Higher = worse. Used to surface the most-affected services first and pick the menu-bar icon. */
export function severityRank(indicator: Indicator): number {
  switch (indicator) {
    case "critical":
      return 4;
    case "major":
      return 3;
    case "minor":
      return 2;
    case "maintenance":
      return 1;
    default:
      return 0;
  }
}
