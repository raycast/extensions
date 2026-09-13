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

/**
 * Raycast `Color` values are opaque tokens (e.g. "raycast-yellow"), not real
 * CSS colors. They work in Raycast-managed UI (icons, tags, ...) but the
 * markdown image renderer does not resolve them inside an inline SVG, so a
 * `stroke="raycast-yellow"` path is simply invisible (notably on Windows).
 * This maps each token to a concrete hex color per appearance.
 *
 * Values are chosen so every color keeps a contrast ratio >= 3:1 (WCAG AA
 * for graphics) against typical light (#F2F2F7) and dark (#1E1E1E) backgrounds.
 */
export const LINE_COLOR_HEX: Record<string, { light: string; dark: string }> = {
  [Color.Blue]: { light: "#0A7AFF", dark: "#3B9EFF" },
  [Color.Green]: { light: "#1F9D55", dark: "#30D158" },
  [Color.Magenta]: { light: "#E0338A", dark: "#FF5FA0" },
  [Color.Orange]: { light: "#D46500", dark: "#FF9F0A" },
  [Color.Purple]: { light: "#8E44D9", dark: "#BF5AF2" },
  [Color.Red]: { light: "#E5352B", dark: "#FF453A" },
  [Color.Yellow]: { light: "#A67C00", dark: "#FFD60A" },
};
