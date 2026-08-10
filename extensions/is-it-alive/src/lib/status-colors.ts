import { Color, Icon } from "@raycast/api";
import type { Image } from "@raycast/api";
import type { ComponentStatusValue, StatusIndicator } from "@/types";

export function indicatorColor(indicator: StatusIndicator | string): Color {
  switch (indicator) {
    case "none":
      return Color.Green;
    case "minor":
      return Color.Yellow;
    case "major":
      return Color.Orange;
    case "critical":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

export function indicatorListIcon(
  indicator: StatusIndicator | string,
): Image.ImageLike {
  switch (indicator) {
    case "none":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "minor":
      return { source: Icon.Warning, tintColor: Color.Yellow };
    case "major":
      return { source: Icon.Warning, tintColor: Color.Orange };
    case "critical":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}

export function componentStatusLabel(
  status: ComponentStatusValue | string,
): string {
  switch (status) {
    case "operational":
      return "Operational";
    case "degraded_performance":
      return "Degraded Performance";
    case "partial_outage":
      return "Partial Outage";
    case "major_outage":
      return "Major Outage";
    case "full_outage":
      return "Major Outage";
    case "under_maintenance":
      return "Under Maintenance";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function componentStatusListIcon(
  status: ComponentStatusValue | string,
): Image.ImageLike {
  switch (status) {
    case "operational":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "degraded_performance":
      return { source: Icon.Warning, tintColor: Color.Yellow };
    case "partial_outage":
      return { source: Icon.Warning, tintColor: Color.Orange };
    case "major_outage":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "full_outage":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "under_maintenance":
      return { source: Icon.Warning, tintColor: Color.Blue };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}
