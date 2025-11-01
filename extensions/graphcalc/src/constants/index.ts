import { Color } from "@raycast/api";
import { ThemeColorName } from "../types";

export const THEME_COLORS: ThemeColorName[] = [
  "Blue",
  "Green",
  "Magenta",
  "Orange",
  "Purple",
  "Red",
  "Yellow",
];

export const MAX_ZOOM_LEVEL = 10;
export const MIN_ZOOM_LEVEL = -10;

export const MAX_PAN_LEVEL = 10;

export const INITIAL_X_MIN = -5;
export const INITIAL_X_MAX = 5;
export const INITIAL_Y_MIN = -5;
export const INITIAL_Y_MAX = 5;

export const NUM_POINTS = 1000;

export const DEFAULT_LINE_COLOR = Color.Yellow;
