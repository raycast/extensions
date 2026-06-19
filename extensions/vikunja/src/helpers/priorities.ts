import { Color } from "@raycast/api";

export const PRIORITY_MAP: Record<number, string> = {
  0: "Unset",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
  5: "DO NOW",
};

export const PRIORITY_COLORS: Record<number, Color> = {
  0: Color.SecondaryText,
  1: Color.Blue,
  2: Color.Yellow,
  3: Color.Orange,
  4: Color.Red,
  5: Color.Magenta,
};
