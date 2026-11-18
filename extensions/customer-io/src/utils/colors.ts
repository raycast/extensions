import { Color } from "@raycast/api";

/**
 * Returns the appropriate color for a campaign/broadcast state.
 */
export function getStateColor(state?: string): Color {
  if (!state) return Color.SecondaryText;
  switch (state.toLowerCase()) {
    case "running":
    case "active":
    case "sent":
      return Color.Green;
    case "paused":
    case "stopped":
      return Color.Red;
    case "draft":
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
}
