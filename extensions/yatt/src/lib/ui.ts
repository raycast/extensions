import { Color, Icon, type Image } from "@raycast/api";
import type { Shade } from "../core/business";
import type { Location } from "../core/types";

const DEFAULT_SHADE_COLOR: Record<Shade, Color> = {
  business: Color.Green,
  shoulder: Color.Yellow,
  off: Color.Red,
};

/** The colour for a shade: the hex from Settings when set, else Raycast's theme-aware colour. */
export function shadeColor(shade: Shade, overrides: Partial<Record<Shade, string>> = {}): Color.ColorLike {
  return overrides[shade] ?? DEFAULT_SHADE_COLOR[shade];
}

export const SHADE_LABEL: Record<Shade, string> = {
  business: "Business hours",
  shoulder: "Shoulder hours",
  off: "Outside working hours",
};

/**
 * Colour for accessory text, which accepts only Raycast's own colours: the theme colour by default, none when a
 * hex override is set (the dot and the strip carry the override; the text stays readable in any theme).
 */
export function shadeTextColor(shade: Shade, overrides: Partial<Record<Shade, string>> = {}): Color | undefined {
  return overrides[shade] ? undefined : DEFAULT_SHADE_COLOR[shade];
}

export function shadeIcon(shade: Shade, overrides: Partial<Record<Shade, string>> = {}): Image.ImageLike {
  return { source: Icon.CircleFilled, tintColor: shadeColor(shade, overrides) };
}

/** Regional-indicator flag for an ISO country code. */
export function flag(country?: string): string {
  if (!country || country.length !== 2) return "";
  return String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function locationSubtitle(l: Location): string {
  if (l.kind === "zone") return l.tz;
  return [l.region, l.country].filter(Boolean).join(", ");
}

/** Short code for copy templates: first 3-letter alias upper-cased, else the label. */
export function locationCode(l: Location): string {
  const code = l.aliases.find((a) => /^[a-z]{3}$/.test(a));
  return code ? code.toUpperCase() : l.label;
}
