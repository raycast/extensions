import { Color } from "@raycast/api";

export function getContentRatingColor(rating: string): Color {
  switch (rating) {
    case "G":
    case "TV-Y":
    case "TV-Y7":
    case "TV-G":
      return Color.Green;
    case "PG":
    case "TV-PG":
      return Color.Yellow;
    case "PG-13":
    case "TV-14":
      return Color.Orange;
    case "R":
    case "TV-MA":
      return Color.Red;
    case "NC-17":
      return Color.Magenta;
    default:
      return Color.SecondaryText;
  }
}
