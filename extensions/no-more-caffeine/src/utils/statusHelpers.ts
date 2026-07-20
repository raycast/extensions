import { Color } from "@raycast/api";

export function getStatusEmoji(status: string): string {
  switch (status) {
    case "no-more-caffeine":
      return "🚫";
    case "warning":
      return "⚠️";
    case "safe":
      return "✅";
    default:
      return "";
  }
}

export function getStatusMessage(status: string): string {
  switch (status) {
    case "no-more-caffeine":
      return "No More Caffeine";
    case "warning":
      return "Warning";
    case "safe":
      return "Safe";
    default:
      return "Unknown";
  }
}

export function getStatusColor(status: string): Color {
  switch (status) {
    case "no-more-caffeine":
      return Color.Red;
    case "warning":
      return Color.Orange;
    case "safe":
      return Color.Green;
    default:
      return Color.PrimaryText;
  }
}

export function getStatusText(status: string): string {
  return getStatusMessage(status);
}
