// utils/tagColorUtils.ts
import { Color } from "@raycast/api";

export const TAG_COLOR_MAP: Record<string, Color> = {
  red: Color.Red,
  yellow: Color.Yellow,
  green: Color.Green,
  orange: Color.Orange,
  blue: Color.Blue,
};

export function getTagTintColor(isSystem: boolean, systemTag?: { color?: string }): Color {
  if (!isSystem) {
    return Color.SecondaryText;
  }

  return TAG_COLOR_MAP[systemTag?.color || ""] || Color.PrimaryText;
}
