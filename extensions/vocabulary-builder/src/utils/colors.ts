import { Color } from "@raycast/api";

export const COLOR_MAP: Partial<Record<keyof typeof Color, Color.ColorLike>> = {
  Red: Color.Red,
  Blue: Color.Blue,
  Green: Color.Green,
  Yellow: Color.Yellow,
  Orange: Color.Orange,
  Purple: Color.Purple,
  Magenta: Color.Magenta,
};

export const COLOR_KEYS = Object.keys(COLOR_MAP) as (keyof typeof COLOR_MAP)[];

export function getColor(value: string): Color.ColorLike {
  return COLOR_MAP[value as keyof typeof COLOR_MAP] ?? Color.PrimaryText;
}
