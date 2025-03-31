import { Color } from "@raycast/api";

export type InterfaceColors = Record<number | string, Color>;

export const PORT_SPEED_COLORS: InterfaceColors = {
  10: Color.Orange,
  100: Color.Yellow,
  1000: Color.Green,
  2500: Color.Blue,
  10000: Color.Purple,
};

export const FrequencyColors: InterfaceColors = {
  "2.4": Color.Orange,
  "5": Color.Blue,
  "6": Color.Purple,
  "60": Color.Green,
};
