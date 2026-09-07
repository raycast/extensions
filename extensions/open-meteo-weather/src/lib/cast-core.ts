// Cast's world — shared types, palette, and drawing primitives.
// No dependencies; every other cast-* module builds on this one.

export const W = 840;
export const H = 490;
export const GROUND_Y = 402;
export const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif`;

/** Fits the side detail panel of a List at Raycast's default window size. */
export const CAST_PANEL_WIDTH = 310;

// ---------------------------------------------------------------------------
// Brand palette — Raycast-inspired. The fox stays firmly in the orange-red
// family; magenta/purple/blue/cyan appear only in props and weather effects.
// ---------------------------------------------------------------------------

export const CAST = {
  fur: "#FF6463",
  furDeep: "#E04443",
  cream: "#FFF3E2",
  charcoal: "#2E2833",
  magenta: "#F0439C",
  magentaDeep: "#C22B7E",
  purple: "#8A63F5",
  blue: "#3E8EF7",
  cyan: "#6FCBFF",
  yellow: "#FFC94B",
  // World set-piece colors
  wood: "#7A5238",
  woodDeep: "#5E3E2A",
  wall: "#F1E3CD",
  roof: "#B7513A",
  leafGreen: "#5FA85C",
  leafDeep: "#4E8B4A",
} as const;

// ---------------------------------------------------------------------------
// Scene model types
// ---------------------------------------------------------------------------

export type CastWeather =
  "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "heavyRain" | "snow" | "storm" | "wind";

export type DayPhase = "sunrise" | "day" | "sunset" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Feel = "cold" | "mild" | "hot";

/** Every scene in the catalog. */
export type ActivityId =
  | "windowWatch"
  | "porchCocoa"
  | "porchCoffee"
  | "raking"
  | "picnic"
  | "applePicking"
  | "painting"
  | "gardening"
  | "hideSeek"
  | "cloudWatch"
  | "umbrella"
  | "kite"
  | "hike"
  | "lemonade"
  | "leafBoat"
  | "snowman"
  | "flakeCatch"
  | "skating"
  | "stargaze"
  | "sleep"
  | "goldenHour"
  | "lantern"
  | "sit"
  | "nap"
  | "wakeUp"
  | "breakfast"
  | "lunch"
  | "bedtime"
  | "puddleJump"
  | "campfire"
  | "rainbow"
  | "cider"
  | "raycast";

export interface CastScene {
  weather: CastWeather;
  phase: DayPhase;
  season: Season;
  feel: Feel;
  windy: boolean;
  activity: ActivityId;
  place: string;
  dateLine: string;
  temperature: number;
  unitSymbol: string;
  conditionLabel: string;
  /** One-word mood for metadata rows, e.g. "Basking". */
  mood: string;
  /** Varies scene picks day to day without random jumps mid-session. */
  seed: number;
  /** Local hour 0–23 when known; gates routine scenes (lunch, bedtime). */
  hour?: number;
  /** Freezing rain or drizzle: wet weather that is also an ice hazard. */
  icy?: boolean;
  /** Sun is out but it rained within the last couple of hours. */
  afterRain?: boolean;
  /** Unhealthy air (smoke, haze); keeps Cast indoors regardless of the sky. */
  hazy?: boolean;
  /** Lunar phase 0..1 (0 new, 0.5 full) for a phase-accurate night moon. */
  moonPhase?: number;
}

/** The inputs that decide which activities fit a moment. */
export type SceneConditions = Pick<
  CastScene,
  "weather" | "phase" | "season" | "feel" | "windy" | "hour" | "icy" | "afterRain" | "hazy"
>;

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

export type Pt = [number, number];

/** Deterministic pseudo-random generator so layouts don't jump between renders. */
export function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Triangle with quadratic-rounded corners — ears, roofs, mountains, pennants. */
export function roundedTri(pts: [Pt, Pt, Pt], r: number, fill: string, extra = ""): string {
  const n = 3;
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n];
    const p = pts[i];
    const next = pts[(i + 1) % n];
    const inLen = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    const outLen = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const rr = Math.min(r, inLen / 2.2, outLen / 2.2);
    const entry = lerp(p, prev, rr / inLen);
    const exit = lerp(p, next, rr / outLen);
    d +=
      i === 0 ? `M ${entry[0].toFixed(1)} ${entry[1].toFixed(1)}` : ` L ${entry[0].toFixed(1)} ${entry[1].toFixed(1)}`;
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${exit[0].toFixed(1)} ${exit[1].toFixed(1)}`;
  }
  return `<path d="${d} Z" fill="${fill}" ${extra}/>`;
}

export function shrinkTri(pts: [Pt, Pt, Pt], t: number): [Pt, Pt, Pt] {
  const c: Pt = [(pts[0][0] + pts[1][0] + pts[2][0]) / 3, (pts[0][1] + pts[1][1] + pts[2][1]) / 3];
  return [lerp(c, pts[0], t), lerp(c, pts[1], t), lerp(c, pts[2], t)];
}

export function rotEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angle: number,
  fill: string,
  extra = "",
): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${angle} ${cx} ${cy})" fill="${fill}" ${extra}/>`;
}

export function cloudShape(cx: number, cy: number, scale: number, fill: string, opacity: number): string {
  return `<g transform="translate(${cx} ${cy}) scale(${scale})" fill="${fill}" opacity="${opacity}">
    <ellipse cx="0" cy="0" rx="52" ry="32"/>
    <ellipse cx="-46" cy="12" rx="34" ry="22"/>
    <ellipse cx="46" cy="10" rx="38" ry="24"/>
    <rect x="-68" y="6" width="136" height="28" rx="14"/>
  </g>`;
}

export { escapeXml } from "./text";
