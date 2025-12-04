import { Color } from "@raycast/api";

export function getTagTintColor(isSystem: boolean, systemTag?: { color?: Color | string }): Color {
  if (!isSystem) {
    return Color.SecondaryText;
  }

  // If the color is already a Color enum value, return it directly
  if (systemTag?.color !== undefined) {
    return systemTag.color as Color;
  }

  // Default color if no color is specified
  return Color.PrimaryText;
}
