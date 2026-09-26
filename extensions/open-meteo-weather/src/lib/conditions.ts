import { Color, Icon } from "@raycast/api";
import { GlyphKind, kindFor } from "./palettes";

export { labelFor } from "./palettes";

const ICONS: Record<GlyphKind, Icon> = {
  sun: Icon.Sun,
  moon: Icon.Moon,
  partly: Icon.CloudSun,
  cloudy: Icon.Cloud,
  fog: Icon.Snippets,
  drizzle: Icon.CloudRain,
  rain: Icon.CloudRain,
  snow: Icon.Snowflake,
  storm: Icon.CloudLightning,
};

const TAG_COLORS: Record<GlyphKind, Color> = {
  sun: Color.Yellow,
  moon: Color.Yellow,
  partly: Color.Blue,
  cloudy: Color.SecondaryText,
  fog: Color.SecondaryText,
  drizzle: Color.Blue,
  rain: Color.Blue,
  snow: Color.PrimaryText,
  storm: Color.Orange,
};

export function iconFor(code: number): Icon {
  return ICONS[kindFor(code)];
}

export function tagColorFor(code: number): Color {
  return TAG_COLORS[kindFor(code)];
}
