/**
 * Central icons used as the extension's own UI chrome.
 *
 * The style submenus are illustrated with the same glyphs centralicons.com uses
 * for its Style / Corner / Stroke controls, so the extension's vocabulary and
 * iconography match the web app a user switches between.
 *
 * These come from the bundled geometry rather than being hardcoded, so they
 * track whatever style the user has active. If that style isn't built, the
 * caller falls back to a Raycast built-in.
 */

import { Color, Icon, type Image } from "@raycast/api";
import { readSvg } from "./manifest";
import { svgToDataUri } from "./svg";

/** Central icon names for the axis controls, matching the web app's own UI. */
const AXIS_ICONS = {
  style: "IconToggle",
  corner: "IconCornerRadius",
  stroke: "IconFormCircle",
} as const;

export type AxisIcon = keyof typeof AXIS_ICONS;

/** Fallbacks for when the named glyph isn't in the built style. */
const FALLBACKS: Record<AxisIcon, Icon> = {
  style: Icon.Circle,
  corner: Icon.Maximize,
  stroke: Icon.LineChart,
};

/**
 * Resolve an axis control's icon, preferring the Central glyph.
 *
 * Reads from whichever style is currently built; `style` is passed in rather
 * than assumed so the chrome matches the icons on screen.
 */
export function axisIcon(axis: AxisIcon, style: string): Image.ImageLike {
  const svg = readSvg(style, AXIS_ICONS[axis]);
  if (!svg) return FALLBACKS[axis];
  return { source: svgToDataUri(svg), tintColor: Color.PrimaryText };
}
