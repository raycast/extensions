import { Color, Icon, Image } from "@raycast/api";

const HEY_COLOR_MAP: Record<string, Color.ColorLike> = {
  teal: Color.Green,
  green: Color.Green,
  blue: Color.Blue,
  pink: Color.Magenta,
  purple: Color.Purple,
  red: Color.Red,
  black: Color.PrimaryText,
  orange: Color.Orange,
  yellow: Color.Yellow,
};

export function heyColorTint(color: string | undefined): Color.ColorLike {
  if (!color) {
    return Color.SecondaryText;
  }
  return HEY_COLOR_MAP[color.toLowerCase()] ?? Color.SecondaryText;
}

export function heyColorIcon(color: string | undefined) {
  return { source: Icon.Circle, tintColor: heyColorTint(color) };
}

export function habitIcon(iconUrl: string | undefined) {
  if (iconUrl) {
    return { source: iconUrl, mask: Image.Mask.RoundedRectangle };
  }
  return heyColorIcon(undefined);
}
