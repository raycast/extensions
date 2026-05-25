import { Color, Image } from "@raycast/api";
import { Platform } from "./heatmaps";

/**
 * Whether platform brand icons render in their brand hex ("color") or in
 * Raycast's theme-adaptive text color ("monochrome"). Light and dark
 * appearance pick this independently via the user's preferences.
 */
export type IconColorMode = "color" | "monochrome";

/**
 * Resolve a platform's brand glyph to a Raycast image, applying the chosen
 * tint mode. Black-brand platforms (TikTok, X, Threads) fall back to
 * `Color.PrimaryText` even in color mode, because pure black is invisible
 * on Raycast's dark background; PrimaryText is theme-adaptive and stays
 * readable in both light and dark.
 */
export function platformIcon(
  platform: Platform,
  mode: IconColorMode,
): Image.ImageLike {
  const source = platform.iconSvg;
  if (mode === "monochrome") return { source, tintColor: Color.PrimaryText };
  if (platform.brandColor === "#000000")
    return { source, tintColor: Color.PrimaryText };
  return { source, tintColor: platform.brandColor };
}

/** Solid-clock chip for "best" windows in the row accessories. */
export const CLOCK_BEST: Image.ImageLike = {
  source: "clock-solid.svg",
  tintColor: Color.Green,
};

/** Outline-clock chip for "good-only" windows in the row accessories. */
export const CLOCK_GOOD: Image.ImageLike = {
  source: "clock-outline.svg",
  tintColor: Color.SecondaryText,
};
