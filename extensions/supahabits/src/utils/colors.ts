import { Color } from "@raycast/api";

export const COLOR_OPTIONS = {
  green: "🟢 Green",
  purple: "🟣 Purple",
  blue: "🔵 Blue",
  yellow: "🟡 Yellow",
  pink: "🌸 Pink",
  orange: "🟠 Orange",
};

export const getColorValue = (color: string): Color => {
  switch (color) {
    case "green":
      return Color.Green;
    case "purple":
      return Color.Purple;
    case "blue":
      return Color.Blue;
    case "yellow":
      return Color.Yellow;
    case "pink":
      return Color.Magenta;
    case "orange":
      return Color.Orange;
    default:
      return Color.PrimaryText;
  }
};
