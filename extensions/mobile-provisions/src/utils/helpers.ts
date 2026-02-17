import { Color } from "@raycast/api";
import { ProfileType } from "../types";

export function getProfileTypeColor(type: ProfileType): Color {
  switch (type) {
    case "Development":
      return Color.Green;
    case "Ad Hoc":
      return Color.Orange;
    case "App Store":
      return Color.Blue;
    case "Enterprise":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
}
