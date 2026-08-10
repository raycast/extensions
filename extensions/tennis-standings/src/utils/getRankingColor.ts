import { Color } from "@raycast/api";

export const getRankingColor = (num: number) => {
  if (num === 0) {
    return Color.SecondaryText;
  }
  if (num > 0) {
    return Color.Green;
  }
  if (num < 0) {
    return Color.Red;
  }
};
