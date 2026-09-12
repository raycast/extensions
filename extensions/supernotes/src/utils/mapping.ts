import { Color } from "@raycast/api";

import { ICard } from "~/utils/types";

export const ColorMap: Record<string, string> = {
  blue: Color.Blue,
  pink: Color.Magenta,
  purple: Color.Purple,
  green: Color.Green,
  yellow: Color.Yellow,
  orange: Color.Orange,
  red: Color.Red,
};

export const determineCardColor = (card: ICard) => {
  if (card.membership.personal_color) {
    return ColorMap[card.membership.personal_color];
  } else if (card.data.color) {
    return ColorMap[card.data.color];
  } else {
    return Color.SecondaryText;
  }
};

export const PermMap: Record<string, string> = {
  "-1": "Inherit",
  "0": "None",
  "1318": "Reader",
  "1382": "Contributor",
  "1398": "Editor",
  "4094": "Moderator",
  "8190": "Author",
};
