// Pure visual data for weather conditions — no Raycast imports, so it can be
// used by the SVG renderer, the theme engine, and dev preview scripts alike.

export type GlyphKind = "sun" | "moon" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface Palette {
  /** Sky gradient, top to bottom */
  sky: [string, string, string];
  /** Accent used for text highlights and chart stroke */
  accent: string;
  /** Soft glow color behind the glyph */
  glow: string;
}

interface ConditionInfo {
  label: string;
  kind: GlyphKind;
  day: Palette;
  night: Palette;
}

const NIGHT_CLEAR: Palette = { sky: ["#0b1026", "#1b2a4a", "#2c4770"], accent: "#ffd76e", glow: "#f5e7b8" };
const NIGHT_CLOUDY: Palette = { sky: ["#101422", "#1e2536", "#2f3a52"], accent: "#aab8d4", glow: "#8fa3c8" };
const NIGHT_WET: Palette = { sky: ["#0c111e", "#1a2233", "#273349"], accent: "#7fb4ff", glow: "#5f87c9" };

const CLEAR_DAY: Palette = { sky: ["#2f7bd9", "#5aa7ec", "#a6d4f7"], accent: "#ffe08a", glow: "#ffd75e" };
const PARTLY_DAY: Palette = { sky: ["#4a86c8", "#7fb0dd", "#c3ddf0"], accent: "#fff1bd", glow: "#ffe9a3" };
const OVERCAST_DAY: Palette = { sky: ["#5d6b7e", "#8494a6", "#b4c1cd"], accent: "#e8eef4", glow: "#cdd8e2" };
const FOG_DAY: Palette = { sky: ["#7c8894", "#9aa6b1", "#c2cbd3"], accent: "#eef2f5", glow: "#d5dde3" };
const DRIZZLE_DAY: Palette = { sky: ["#4e6480", "#71889f", "#a3b6c6"], accent: "#a8d4ff", glow: "#8fc2f2" };
const RAIN_DAY: Palette = { sky: ["#3a4c66", "#586e88", "#8298ae"], accent: "#8ec6ff", glow: "#6ea9e8" };
const HEAVY_RAIN_DAY: Palette = { sky: ["#2c3a50", "#465a73", "#6c8298"], accent: "#7dbcff", glow: "#5d9bdc" };
const SNOW_DAY: Palette = { sky: ["#6d7f96", "#93a5b9", "#c8d4df"], accent: "#ffffff", glow: "#e8f1f8" };
const SNOW_NIGHT: Palette = { sky: ["#141a2a", "#242f45", "#3a4a63"], accent: "#eaf3fb", glow: "#c9dcec" };
const STORM_DAY: Palette = { sky: ["#2b3247", "#454e66", "#6a7389"], accent: "#ffd75e", glow: "#f7c948" };
const STORM_NIGHT: Palette = { sky: ["#0e1120", "#1e2336", "#31394f"], accent: "#ffd75e", glow: "#f7c948" };

function info(label: string, kind: GlyphKind, day: Palette, night: Palette): ConditionInfo {
  return { label, kind, day, night };
}

const OVERCAST = info("Overcast", "cloudy", OVERCAST_DAY, NIGHT_CLOUDY);

const BY_CODE: Record<number, ConditionInfo> = {
  0: info("Clear Sky", "sun", CLEAR_DAY, NIGHT_CLEAR),
  1: info("Mainly Clear", "sun", { ...CLEAR_DAY, sky: ["#3a83da", "#6cb0ea", "#b6dcf6"] }, NIGHT_CLEAR),
  2: info("Partly Cloudy", "partly", PARTLY_DAY, NIGHT_CLEAR),
  3: OVERCAST,
  45: info("Fog", "fog", FOG_DAY, NIGHT_CLOUDY),
  48: info("Rime Fog", "fog", FOG_DAY, NIGHT_CLOUDY),
  51: info("Light Drizzle", "drizzle", DRIZZLE_DAY, NIGHT_WET),
  53: info("Drizzle", "drizzle", DRIZZLE_DAY, NIGHT_WET),
  55: info("Dense Drizzle", "drizzle", DRIZZLE_DAY, NIGHT_WET),
  56: info("Freezing Drizzle", "drizzle", DRIZZLE_DAY, NIGHT_WET),
  57: info("Freezing Drizzle", "drizzle", DRIZZLE_DAY, NIGHT_WET),
  61: info("Light Rain", "rain", RAIN_DAY, NIGHT_WET),
  63: info("Rain", "rain", RAIN_DAY, NIGHT_WET),
  65: info("Heavy Rain", "rain", HEAVY_RAIN_DAY, NIGHT_WET),
  66: info("Freezing Rain", "rain", RAIN_DAY, NIGHT_WET),
  67: info("Freezing Rain", "rain", HEAVY_RAIN_DAY, NIGHT_WET),
  71: info("Light Snow", "snow", SNOW_DAY, SNOW_NIGHT),
  73: info("Snow", "snow", SNOW_DAY, SNOW_NIGHT),
  75: info("Heavy Snow", "snow", SNOW_DAY, SNOW_NIGHT),
  77: info("Snow Grains", "snow", SNOW_DAY, SNOW_NIGHT),
  80: info("Light Showers", "rain", RAIN_DAY, NIGHT_WET),
  81: info("Showers", "rain", RAIN_DAY, NIGHT_WET),
  82: info("Heavy Showers", "rain", HEAVY_RAIN_DAY, NIGHT_WET),
  85: info("Snow Showers", "snow", SNOW_DAY, SNOW_NIGHT),
  86: info("Snow Showers", "snow", SNOW_DAY, SNOW_NIGHT),
  95: info("Thunderstorm", "storm", STORM_DAY, STORM_NIGHT),
  96: info("Storm with Hail", "storm", STORM_DAY, STORM_NIGHT),
  99: info("Storm with Hail", "storm", STORM_DAY, STORM_NIGHT),
};

function conditionInfo(code: number): ConditionInfo {
  return BY_CODE[code] ?? OVERCAST;
}

export function labelFor(code: number): string {
  return conditionInfo(code).label;
}

export function kindFor(code: number): GlyphKind {
  return conditionInfo(code).kind;
}

/** Resolve the glyph, swapping sun for moon at night. */
export function glyphFor(code: number, isDay: boolean): GlyphKind {
  const kind = kindFor(code);
  if (!isDay && kind === "sun") return "moon";
  return kind;
}

export function paletteFor(code: number, isDay: boolean): Palette {
  const c = conditionInfo(code);
  return isDay ? c.day : c.night;
}
