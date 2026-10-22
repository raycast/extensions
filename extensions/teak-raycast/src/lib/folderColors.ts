import { Color } from "@raycast/api";

// Teak's folder colors as Raycast tints.
const FOLDER_TINTS: Record<string, Color.ColorLike> = {
  amber: Color.Yellow,
  blue: Color.Blue,
  gray: Color.SecondaryText,
  green: Color.Green,
  orange: Color.Orange,
  pink: Color.Magenta,
  red: Color.Red,
  teal: "#14B8A6",
  violet: Color.Purple,
};

export const folderTint = (color: string | null): Color.ColorLike =>
  (color && FOLDER_TINTS[color]) || Color.SecondaryText;
