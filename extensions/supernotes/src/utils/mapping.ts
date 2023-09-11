import { Color } from "@raycast/api";

export const ColorMap: Record<string, string> = {
  lightBlue: Color.Blue,
  lightPink: Color.Magenta,
  lightPurple: Color.Purple,
  lightGreen: Color.Green,
  lightYellow: Color.Yellow,
  lightOrange: Color.Orange,
  lightRed: Color.Red,
};

export const PermMap: Record<string, string> = {
  "-1": "Inherit",
  "2369": "Ghost",
  "207695": "Reader",
  "207823": "Contributor",
  "211951": "Editor",
  "524287": "Moderator",
  "2097151": "Author",
};
