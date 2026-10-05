// Theme engine: turns a weather condition into a full visual style for the
// hero renderer. Pure module — safe to use outside Raycast (e.g. previews).

import { GlyphKind, kindFor, paletteFor } from "./palettes";

export const THEME_IDS = [
  "atmosphere",
  "synthwave",
  "noir",
  "paper",
  "golden",
  "terminal",
  "blueprint",
  "candy",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
}

export interface HeroStyle {
  /** Sky gradient, top to bottom */
  sky: [string, string, string];
  /** Chart stroke, condition label, lightning */
  accent: string;
  /** Sun/moon fill and radial glow behind the glyph */
  glow: string;
  /** Primary text color (secondary text derives from it via opacity) */
  text: string;
  /** Main cloud fill */
  cloud: string;
  /** Secondary/back cloud fill */
  cloudShade: string;
  /** Snowflakes, fog streaks, storm side-drops */
  flake: string;
  stars: boolean;
}

/** Condition groups that share a sky within stylized themes. */
type SkyGroup = "clear" | "cloudy" | "wet" | "snow" | "storm";

function groupOf(kind: GlyphKind): SkyGroup {
  switch (kind) {
    case "sun":
    case "moon":
    case "partly":
      return "clear";
    case "cloudy":
    case "fog":
      return "cloudy";
    case "drizzle":
    case "rain":
      return "wet";
    case "snow":
      return "snow";
    case "storm":
      return "storm";
  }
}

function grayscale(hex: string, dim = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const l = Math.round(Math.min(255, (0.2126 * r + 0.7152 * g + 0.0722 * b) * dim));
  const h = l.toString(16).padStart(2, "0");
  return `#${h}${h}${h}`;
}

function atmosphere(code: number, isDay: boolean): HeroStyle {
  const p = paletteFor(code, isDay);
  return {
    sky: p.sky,
    accent: p.accent,
    glow: p.glow,
    text: "#ffffff",
    cloud: "#ffffff",
    cloudShade: "#dce7f2",
    flake: "#ffffff",
    stars: !isDay,
  };
}

const SYNTHWAVE_SKIES: Record<
  SkyGroup,
  { day: [string, string, string]; night: [string, string, string]; accent: string }
> = {
  clear: { day: ["#241b4d", "#5b2a86", "#e0529c"], night: ["#0d0221", "#261447", "#4b1d70"], accent: "#ff71ce" },
  cloudy: { day: ["#1a1038", "#32215c", "#544087"], night: ["#120a2e", "#241847", "#3c2a66"], accent: "#01cdfe" },
  wet: { day: ["#160f33", "#2b1b54", "#413173"], night: ["#0e0926", "#1e1440", "#2f2359"], accent: "#01cdfe" },
  snow: { day: ["#1c1440", "#3a2a6b", "#5f4a99"], night: ["#130d30", "#2a1e52", "#443370"], accent: "#e8ddff" },
  storm: { day: ["#12081f", "#2a103f", "#4a1a5e"], night: ["#0c051a", "#1e0b30", "#361247"], accent: "#fffb96" },
};

function synthwave(code: number, isDay: boolean): HeroStyle {
  const s = SYNTHWAVE_SKIES[groupOf(kindFor(code))];
  return {
    sky: isDay ? s.day : s.night,
    accent: s.accent,
    glow: isDay ? "#ffb347" : "#e8ddff",
    text: "#ffffff",
    cloud: "#b8a1e8",
    cloudShade: "#9a7fd4",
    flake: "#e8ddff",
    stars: true,
  };
}

function noir(code: number, isDay: boolean): HeroStyle {
  const p = paletteFor(code, isDay);
  const dim = isDay ? 0.82 : 1;
  return {
    sky: [grayscale(p.sky[0], dim), grayscale(p.sky[1], dim), grayscale(p.sky[2], dim)],
    accent: "#ffffff",
    glow: "#dcdcdc",
    text: "#ffffff",
    cloud: "#c8c8c8",
    cloudShade: "#9e9e9e",
    flake: "#ffffff",
    stars: !isDay,
  };
}

const PAPER_SKIES: Record<SkyGroup, { sky: [string, string, string]; accent: string; glow: string }> = {
  clear: { sky: ["#fdf8ec", "#f7ecd4", "#eeddb8"], accent: "#c2410c", glow: "#f4b93c" },
  cloudy: { sky: ["#f4f1ea", "#e8e4d8", "#d6d0c0"], accent: "#6b6455", glow: "#d8d2c2" },
  wet: { sky: ["#eef1f2", "#dde4e6", "#c5d1d6"], accent: "#1d6a96", glow: "#a8c4d0" },
  snow: { sky: ["#f2f4f5", "#e5e9ec", "#d2dae0"], accent: "#5a7a99", glow: "#c2d0da" },
  storm: { sky: ["#eae6dd", "#d8d2c4", "#bfb7a4"], accent: "#b45309", glow: "#e0a92e" },
};

function paper(code: number, isDay: boolean): HeroStyle {
  const s = PAPER_SKIES[groupOf(kindFor(code))];
  return {
    sky: isDay ? s.sky : (s.sky.map((c, i) => (i === 0 ? "#e8e2d4" : c)) as [string, string, string]),
    accent: s.accent,
    glow: isDay ? s.glow : "#d9b95c",
    text: "#3d3427",
    cloud: "#cfc6b2",
    cloudShade: "#b8ad94",
    flake: "#7d92a8",
    stars: false,
  };
}

const GOLDEN_SKIES: Record<
  SkyGroup,
  { day: [string, string, string]; night: [string, string, string]; accent: string }
> = {
  clear: { day: ["#7a4f9e", "#d96a68", "#f4a45b"], night: ["#2b1b45", "#5e3457", "#8a4a52"], accent: "#ffd166" },
  cloudy: { day: ["#6d5b86", "#b3776f", "#d99a66"], night: ["#241a38", "#4a3350", "#6d4a4e"], accent: "#f4a261" },
  wet: { day: ["#5a4a7d", "#94647a", "#b97f6d"], night: ["#1f1733", "#3d2c4d", "#5c3f52"], accent: "#ffb4a2" },
  snow: { day: ["#7d6b9e", "#c98f8f", "#e8b48a"], night: ["#2a2142", "#4f3c5c", "#75555e"], accent: "#ffe8d6" },
  storm: { day: ["#4a3364", "#8a4a5e", "#b2624f"], night: ["#180f2b", "#33203f", "#4f2c42"], accent: "#ffd166" },
};

/** Perpetual sunset: every condition bathed in warm dusk light. */
function golden(code: number, isDay: boolean): HeroStyle {
  const s = GOLDEN_SKIES[groupOf(kindFor(code))];
  return {
    sky: isDay ? s.day : s.night,
    accent: s.accent,
    glow: isDay ? "#ffcf6b" : "#f5b971",
    text: "#fff6ec",
    cloud: "#f5dcc8",
    cloudShade: "#e3bfa4",
    flake: "#ffe8d6",
    stars: !isDay,
  };
}

/** Map a color's luminance onto green phosphor, CRT style. */
function phosphor(hex: string, dim = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const l = Math.min(255, (0.2126 * r + 0.7152 * g + 0.0722 * b) * dim);
  const c = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${c(l * 0.14)}${c(l * 0.62)}${c(l * 0.3)}`;
}

function terminal(code: number, isDay: boolean): HeroStyle {
  const p = paletteFor(code, isDay);
  const dim = isDay ? 0.8 : 1;
  return {
    sky: [phosphor(p.sky[0], dim), phosphor(p.sky[1], dim), phosphor(p.sky[2], dim)],
    accent: "#4afa7b",
    glow: "#7dffa0",
    text: "#c8ffd4",
    cloud: "#2e9e57",
    cloudShade: "#1c6b3a",
    flake: "#8affb0",
    stars: true,
  };
}

const BLUEPRINT_SKIES: Record<SkyGroup, [string, string, string]> = {
  clear: ["#0a2a6b", "#0d3585", "#11409e"],
  cloudy: ["#092459", "#0b2d70", "#0e3684"],
  wet: ["#081f4d", "#0a2a66", "#0d347d"],
  snow: ["#0b2d70", "#0e3884", "#124399"],
  storm: ["#071a40", "#092459", "#0b2e6e"],
};

function darken(hex: string, f: number): string {
  const c = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * f)
      .toString(16)
      .padStart(2, "0");
  return `#${c(1)}${c(3)}${c(5)}`;
}

/** Cyanotype: white line-work on deep blueprint blue. */
function blueprint(code: number, isDay: boolean): HeroStyle {
  const sky = BLUEPRINT_SKIES[groupOf(kindFor(code))];
  return {
    sky: isDay ? sky : (sky.map((c) => darken(c, 0.62)) as [string, string, string]),
    accent: "#9ad1ff",
    glow: "#cfe8ff",
    text: "#eaf4ff",
    cloud: "#dcebfa",
    cloudShade: "#b7d3ee",
    flake: "#ffffff",
    stars: !isDay,
  };
}

const CANDY_SKIES: Record<
  SkyGroup,
  { day: [string, string, string]; night: [string, string, string]; accent: string }
> = {
  clear: { day: ["#ffd6e8", "#ffc2dc", "#c9b6f2"], night: ["#4a2b6e", "#6b3f8f", "#9a5fb5"], accent: "#ff5fa2" },
  cloudy: { day: ["#e8d9f5", "#d7c7ee", "#b9a8e0"], night: ["#3f2a5e", "#5a3f80", "#7d5aa3"], accent: "#8f6fd6" },
  wet: { day: ["#d4e8f7", "#bcd9f0", "#9ec4e8"], night: ["#2e3a66", "#455289", "#5f6cab"], accent: "#38a3d8" },
  snow: { day: ["#e2ecfa", "#d0def5", "#b6c8ec"], night: ["#38406e", "#525b92", "#7079b3"], accent: "#6fa8d9" },
  storm: { day: ["#f5dcd0", "#eec5b8", "#d8a08f"], night: ["#4a2b52", "#6e3f6b", "#94577e"], accent: "#f7863c" },
};

/** Pastel pop: bubblegum skies, dark plum ink by day. */
function candy(code: number, isDay: boolean): HeroStyle {
  const s = CANDY_SKIES[groupOf(kindFor(code))];
  return {
    sky: isDay ? s.day : s.night,
    accent: isDay ? s.accent : "#ffb3da",
    glow: "#ffd97a",
    text: isDay ? "#53306b" : "#fff0fa",
    cloud: "#ffffff",
    cloudShade: "#f2d6ea",
    flake: isDay ? "#8fb8e8" : "#ffffff",
    stars: !isDay,
  };
}

export function styleFor(theme: ThemeId, code: number, isDay: boolean): HeroStyle {
  switch (theme) {
    case "synthwave":
      return synthwave(code, isDay);
    case "noir":
      return noir(code, isDay);
    case "paper":
      return paper(code, isDay);
    case "golden":
      return golden(code, isDay);
    case "terminal":
      return terminal(code, isDay);
    case "blueprint":
      return blueprint(code, isDay);
    case "candy":
      return candy(code, isDay);
    default:
      return atmosphere(code, isDay);
  }
}
