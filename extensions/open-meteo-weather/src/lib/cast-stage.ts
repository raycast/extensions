// The world around the fox: skies, grounds, ambient weather (all animated via
// SMIL), and the recurring set pieces of Cast's world — the den-house with its
// smoking chimney, the apple tree that follows the seasons, mountains, the
// pond, the flower patch, and the small creatures that pass through.

import { aAttr, aOpacity, aRotate, aTranslate, aTranslateLinear, animated, placedAnimated } from "./cast-anim";
import { CAST, CastScene, GROUND_Y, H, Pt, W, cloudShape, mulberry, roundedTri, rotEllipse } from "./cast-core";

// ---------------------------------------------------------------------------
// Sky & ground
// ---------------------------------------------------------------------------

export interface SkyStyle {
  sky: [string, string, string];
  text: string;
  accent: string;
  stars?: boolean;
}

const SKIES: Record<CastScene["weather"], { day: SkyStyle; night: SkyStyle; sunrise?: SkyStyle; sunset?: SkyStyle }> = {
  clear: {
    day: { sky: ["#3F87E0", "#6FB1EC", "#BEE0F8"], text: "#FFFFFF", accent: "#FFE08A" },
    night: { sky: ["#12172F", "#20294D", "#374672"], text: "#FFFFFF", accent: "#FFD76E", stars: true },
    sunrise: { sky: ["#37407E", "#C76D8E", "#FFBB6E"], text: "#FFFFFF", accent: "#FFE1B3" },
    sunset: { sky: ["#432A66", "#C75978", "#FFAE60"], text: "#FFFFFF", accent: "#FFD9A8" },
  },
  partly: {
    day: { sky: ["#4A86C8", "#7FB0DD", "#C3DDF0"], text: "#FFFFFF", accent: "#FFF1BD" },
    night: { sky: ["#12172F", "#20294D", "#374672"], text: "#FFFFFF", accent: "#FFD76E", stars: true },
  },
  cloudy: {
    day: { sky: ["#5D6B7E", "#8494A6", "#B4C1CD"], text: "#FFFFFF", accent: "#E8EEF4" },
    night: { sky: ["#101422", "#1E2536", "#2F3A52"], text: "#FFFFFF", accent: "#AAB8D4" },
  },
  fog: {
    day: { sky: ["#7C8894", "#9AA6B1", "#C2CBD3"], text: "#FFFFFF", accent: "#EEF2F5" },
    night: { sky: ["#1A2030", "#2A3245", "#3E4A5E"], text: "#FFFFFF", accent: "#AAB8D4" },
  },
  drizzle: {
    day: { sky: ["#4E6480", "#71889F", "#A3B6C6"], text: "#FFFFFF", accent: "#A8D4FF" },
    night: { sky: ["#0C111E", "#1A2233", "#273349"], text: "#FFFFFF", accent: "#7FB4FF" },
  },
  rain: {
    day: { sky: ["#3A4C66", "#586E88", "#8298AE"], text: "#FFFFFF", accent: "#8EC6FF" },
    night: { sky: ["#0C111E", "#1A2233", "#273349"], text: "#FFFFFF", accent: "#7FB4FF" },
  },
  heavyRain: {
    day: { sky: ["#2C3A50", "#465A73", "#6C8298"], text: "#FFFFFF", accent: "#7DBCFF" },
    night: { sky: ["#0C111E", "#1A2233", "#273349"], text: "#FFFFFF", accent: "#7FB4FF" },
  },
  snow: {
    day: { sky: ["#6D7F96", "#93A5B9", "#C8D4DF"], text: "#FFFFFF", accent: "#FFFFFF" },
    night: { sky: ["#141A2A", "#242F45", "#3A4A63"], text: "#FFFFFF", accent: "#EAF3FB", stars: true },
  },
  storm: {
    day: { sky: ["#2B3247", "#454E66", "#6A7389"], text: "#FFFFFF", accent: "#FFD75E" },
    night: { sky: ["#0E1120", "#1E2336", "#31394F"], text: "#FFFFFF", accent: "#FFD75E" },
  },
  wind: {
    day: { sky: ["#4A86C8", "#7FB0DD", "#C3DDF0"], text: "#FFFFFF", accent: "#B7E3FF" },
    night: { sky: ["#12172F", "#20294D", "#374672"], text: "#FFFFFF", accent: "#B7E3FF", stars: true },
  },
};

const HAZE_SKY: { day: SkyStyle; night: SkyStyle } = {
  day: { sky: ["#8A6555", "#B48A68", "#DDB58E"], text: "#FFFFFF", accent: "#FFD9A8" },
  night: { sky: ["#1E1720", "#3A2A2C", "#5A4038"], text: "#FFFFFF", accent: "#FFC58A" },
};

export function skyFor(scene: CastScene): SkyStyle {
  if (scene.hazy) return scene.phase === "night" ? HAZE_SKY.night : HAZE_SKY.day;
  const s = SKIES[scene.weather];
  if (scene.phase === "sunrise") return s.sunrise ?? s.day;
  if (scene.phase === "sunset") return s.sunset ?? s.day;
  return scene.phase === "night" ? s.night : s.day;
}

/** [ground, hill] fills per season, with darker night variants. */
export function groundFor(scene: CastScene): [string, string] {
  const night = scene.phase === "night";
  if (scene.weather === "snow" || scene.season === "winter")
    return night ? ["#7E93B4", "#66799A"] : ["#EFF4FA", "#D3E1EF"];
  switch (scene.season) {
    case "spring":
      return night ? ["#2E4A44", "#25403B"] : ["#8CCB84", "#6FB570"];
    case "summer":
      return night ? ["#31493B", "#273E33"] : ["#A5CC72", "#88BA60"];
    case "autumn":
      return night ? ["#4A3A33", "#3D2F2A"] : ["#E3A45B", "#CE8A45"];
    default:
      return night ? ["#2E4A44", "#25403B"] : ["#8CCB84", "#6FB570"];
  }
}

// ---------------------------------------------------------------------------
// Sky contents
// ---------------------------------------------------------------------------

/** Twinkling stars, each on its own staggered cycle. */
export function stars(color: string): string {
  const rand = mulberry(11);
  let out = "";
  for (let i = 0; i < 40; i++) {
    const x = 20 + rand() * (W - 40);
    const y = 14 + rand() * 240;
    const r = 0.6 + rand() * 1.4;
    const base = 0.3 + rand() * 0.55;
    const twinkle = aOpacity([base, Math.max(0.08, base - 0.35), base], {
      dur: 2 + rand() * 2.5,
      begin: -rand() * 4,
    });
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${base.toFixed(2)}">${twinkle}</circle>`;
  }
  return out;
}

/** Sun, low sun, or crescent moon, per phase; the day sun's rays rotate. */
export function celestial(scene: CastScene, ip: string): string {
  const w = scene.weather;
  if (scene.phase === "night") {
    if (scene.hazy || !(w === "clear" || w === "partly" || w === "wind" || w === "snow")) return "";
    const glow = `<circle cx="490" cy="96" r="90" fill="url(#${ip}glow)">${aOpacity([0.85, 1, 0.85], { dur: 5 })}</circle>`;
    const p = scene.moonPhase;
    if (p === undefined) {
      return `${glow}
        <mask id="${ip}cres"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><circle cx="516" cy="76" r="38" fill="#000"/></mask>
        <circle cx="490" cy="96" r="42" fill="#F5E7B8" mask="url(#${ip}cres)"/>`;
    }
    // Phase-accurate: the shadow disc slides off as illumination grows;
    // waxing lights the right limb, waning the left.
    const ill = (1 - Math.cos(2 * Math.PI * p)) / 2;
    if (ill > 0.97) return `${glow}<circle cx="490" cy="96" r="42" fill="#F5E7B8"/>`;
    const offset = (p < 0.5 ? -1 : 1) * ill * 84;
    return `${glow}
      <circle cx="490" cy="96" r="42" fill="#F5E7B8" opacity="0.18"/>
      <mask id="${ip}cres"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><circle cx="${(490 + offset).toFixed(1)}" cy="96" r="42" fill="#000"/></mask>
      <circle cx="490" cy="96" r="42" fill="#F5E7B8" mask="url(#${ip}cres)"/>`;
  }
  if (scene.hazy) {
    // Smoke dims the sun to a rayless red disc.
    return `<circle cx="470" cy="100" r="70" fill="#FF8A5B" opacity="0.25"/><circle cx="470" cy="100" r="40" fill="#FF7A4A" opacity="0.9"/>`;
  }
  if (scene.phase === "sunrise" || scene.phase === "sunset") {
    // Sunrise scenes stage the fox at the porch (x≈455), so the low sun sits
    // over the open meadow on the left; sunset keeps it center-left. In wet or
    // grey weather only a faint glow marks where the sun is coming up.
    const cx = scene.phase === "sunrise" ? 250 : 470;
    const sunOut = w === "clear" || w === "partly" || w === "wind";
    const glow = `<circle cx="${cx}" cy="392" r="120" fill="url(#${ip}glow)">${aOpacity([0.8, 1, 0.8], { dur: 6 })}</circle>`;
    return sunOut ? `${glow}<circle cx="${cx}" cy="392" r="52" fill="${CAST.yellow}"/>` : glow;
  }
  if (w === "clear" || w === "wind") {
    let rays = "";
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + 0.4;
      rays += `<line x1="${(470 + Math.cos(a) * 52).toFixed(1)}" y1="${(100 + Math.sin(a) * 52).toFixed(1)}" x2="${(470 + Math.cos(a) * 70).toFixed(1)}" y2="${(100 + Math.sin(a) * 70).toFixed(1)}" stroke="${CAST.yellow}" stroke-width="8" stroke-linecap="round"/>`;
    }
    // 8-fold symmetry: a 0→45° linear rotation loops seamlessly.
    return `<circle cx="470" cy="100" r="88" fill="url(#${ip}glow)"/>${animated(rays, aRotate([0, 45], 470, 100, { dur: 9, ease: false }))}<circle cx="470" cy="100" r="40" fill="${CAST.yellow}"/>`;
  }
  if (w === "partly")
    return `<circle cx="470" cy="96" r="80" fill="url(#${ip}glow)"/><circle cx="446" cy="82" r="34" fill="${CAST.yellow}"/>${driftingCloud(496, 112, 0.85, "#FFFFFF", 0.96, 12, 8)}`;
  return "";
}

/** A cloud that drifts gently back and forth. */
function driftingCloud(
  cx: number,
  cy: number,
  scale: number,
  fill: string,
  opacity: number,
  amp: number,
  dur: number,
  begin = 0,
): string {
  return animated(
    cloudShape(cx, cy, scale, fill, opacity),
    aTranslate(
      [
        [0, 0],
        [amp, 0],
        [0, 0],
      ],
      { dur, begin },
    ),
  );
}

/** Weather clouds (and the storm's lightning) in the sky band. */
export function skyClouds(scene: CastScene): string {
  const w = scene.weather;
  const night = scene.phase === "night";
  const light = night ? "#8FA0BE" : "#FFFFFF";
  const mid = night ? "#6B7B99" : "#DBE4EC";
  const dark = night ? "#4C5870" : "#AFBCC9";
  switch (w) {
    case "cloudy":
      return (
        driftingCloud(200, 110, 1.0, mid, 0.95, 20, 11) +
        driftingCloud(560, 80, 0.8, dark, 0.8, -16, 13, -4) +
        driftingCloud(700, 160, 0.7, mid, 0.9, 14, 9, -2)
      );
    case "drizzle":
    case "rain":
      return driftingCloud(250, 90, 1.0, mid, 0.95, 18, 10) + driftingCloud(620, 110, 1.1, dark, 0.92, -14, 12, -3);
    case "heavyRain":
      return driftingCloud(230, 84, 1.15, dark, 0.96, 12, 8) + driftingCloud(600, 100, 1.25, dark, 0.96, -10, 9, -2);
    case "snow":
      return driftingCloud(260, 90, 1.0, light, 0.9, 16, 12) + driftingCloud(620, 110, 1.05, light, 0.85, -12, 10, -5);
    case "storm":
      return (
        driftingCloud(300, 96, 1.3, "#39404F", 0.97, 10, 7) +
        driftingCloud(640, 120, 1.0, "#4A5263", 0.9, -8, 8, -3) +
        lightning()
      );
    case "fog":
      return driftingCloud(400, 120, 1.1, mid, 0.5, 24, 14);
    default:
      return "";
  }
}

/** Double flicker per loop, with a faint full-sky flash in sync. */
function lightning(): string {
  const bolt = `<polygon points="330,150 292,225 318,225 288,306 356,232 326,232 356,160" fill="${CAST.yellow}"/>
     <polygon points="330,150 292,225 318,225 288,306 356,232 326,232 356,160" fill="${CAST.magenta}" opacity="0.35" transform="translate(16 10)"/>`;
  const kt = [0, 0.52, 0.55, 0.58, 0.62, 0.66, 1];
  return (
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF" opacity="0">${aOpacity([0, 0, 0.12, 0, 0.09, 0, 0], { dur: 5.5, keyTimes: kt, ease: false })}</rect>` +
    `<g opacity="0">${bolt}${aOpacity([0, 0, 1, 0.25, 1, 0, 0], { dur: 5.5, keyTimes: kt, ease: false })}</g>`
  );
}

// ---------------------------------------------------------------------------
// Ambient weather overlays (foreground)
// ---------------------------------------------------------------------------

/**
 * Falling rain: each drop is drawn twice one band apart, and the whole layer
 * translates down exactly one band per loop — seamless under the frame clip.
 */
function rainOverlay(scene: CastScene): string {
  const heavy = scene.weather === "heavyRain";
  const drizzle = scene.weather === "drizzle";
  const count = drizzle ? 8 : heavy ? 22 : 14;
  const len = heavy ? 38 : 26;
  const width = heavy ? 6 : 5;
  const opacity = drizzle ? 0.4 : heavy ? 0.65 : 0.55;
  const band = 340;
  const rand = mulberry(23);
  let drops = "";
  for (let i = 0; i < count; i++) {
    const x = 24 + rand() * (W - 48);
    const y = 20 + rand() * band;
    for (const dy of [0, -band]) {
      drops += `<line x1="${x.toFixed(0)}" y1="${(y + dy).toFixed(0)}" x2="${(x - len * 0.36).toFixed(0)}" y2="${(y + dy + len).toFixed(0)}" stroke="#9CC8FF" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`;
    }
  }
  const fall = animated(drops, aTranslateLinear([0, 0], [0, band], drizzle ? 1.7 : heavy ? 0.8 : 1.15));
  const ripple = (cx: number, cy: number, begin: number) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="6" ry="1.5" fill="none" stroke="#CFE6FF" stroke-width="2.5" opacity="0">
       ${aAttr("rx", [6, 44], { dur: 2.2, begin, ease: false })}${aAttr("ry", [1.5, 7], { dur: 2.2, begin, ease: false })}${aOpacity([0.7, 0], { dur: 2.2, begin, ease: false })}
     </ellipse>`;
  const puddles = `<ellipse cx="240" cy="450" rx="66" ry="10" fill="${CAST.blue}" opacity="0.3"/><ellipse cx="742" cy="468" rx="54" ry="9" fill="${CAST.blue}" opacity="0.28"/>
    ${ripple(240, 450, 0)}${ripple(240, 450, -1.1)}${ripple(742, 468, -0.6)}`;
  const splash = (x: number, y: number, begin: number) =>
    `<path d="M ${x} ${y} q 6 -12 12 0" stroke="#CFE6FF" stroke-width="3.5" fill="none" opacity="0">${aOpacity([0, 0.8, 0], { dur: 0.8, begin, ease: false })}</path>`;
  const splashes = heavy ? splash(214, 444, 0) + splash(258, 446, -0.3) + splash(730, 462, -0.55) : "";
  return fall + puddles + splashes;
}

/** Falling, swaying snow plus a few slow crystal flakes. */
function snowOverlay(): string {
  const band = 400;
  const rand = mulberry(31);
  let flakes = "";
  for (let i = 0; i < 16; i++) {
    const x = 24 + rand() * (W - 48);
    const y = 10 + rand() * band;
    const r = 2.6 + rand() * 2.6;
    const o = 0.55 + rand() * 0.4;
    const pair = `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#FFFFFF" opacity="${o.toFixed(2)}"/>
      <circle cx="${x.toFixed(0)}" cy="${(y - band).toFixed(0)}" r="${r.toFixed(1)}" fill="#FFFFFF" opacity="${o.toFixed(2)}"/>`;
    flakes += animated(
      pair,
      aTranslate(
        [
          [0, 0],
          [10 + rand() * 8, 0],
          [0, 0],
        ],
        { dur: 2.6 + rand() * 2, begin: -rand() * 3 },
      ),
    );
  }
  const drift = animated(flakes, aTranslateLinear([0, 0], [0, band], 8));
  let crystals = "";
  // Kept clear of the text block in the top-left corner (x < 340, y < 230).
  for (const [x, y, begin] of [
    [420, 150, 0],
    [520, 90, -1.5],
    [700, 220, -0.7],
  ]) {
    crystals += `<g stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9">
      <line x1="${x - 8}" y1="${y}" x2="${x + 8}" y2="${y}"/><line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y + 8}"/>
      <line x1="${x - 6}" y1="${y - 6}" x2="${x + 6}" y2="${y + 6}"/><line x1="${x - 6}" y1="${y + 6}" x2="${x + 6}" y2="${y - 6}"/>
      ${aOpacity([0.9, 0.4, 0.9], { dur: 3, begin: begin as number })}
    </g>`;
  }
  return drift + crystals;
}

/** Fog banks sliding across each other. */
function fogOverlay(): string {
  const band = (x: number, y: number, w: number, h: number, o: number, amp: number, dur: number, begin = 0) =>
    placedAnimated(
      `translate(0 0)`,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#FFFFFF" opacity="${o}"/>`,
      aTranslate(
        [
          [0, 0],
          [amp, 0],
          [0, 0],
        ],
        { dur, begin },
      ),
    );
  return (
    band(60, 286, 520, 26, 0.33, 30, 12) +
    band(220, 336, 620, 30, 0.42, -36, 15, -4) +
    band(0, 392, 580, 32, 0.5, 26, 10, -2) +
    band(330, 436, 510, 30, 0.45, -30, 13, -6)
  );
}

/** Traveling gust streaks (dash-offset) and tumbling leaves. */
function windOverlay(scene: CastScene): string {
  const gust = (x: number, y: number, s: number, dur: number, begin = 0) => {
    const d = `M ${x} ${y} q ${40 * s} ${-26 * s} ${86 * s} 0 t ${86 * s} 0 q ${30 * s} ${-4 * s} ${34 * s} ${-22 * s}`;
    return `<path d="${d}" stroke="${CAST.cyan}" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.75" stroke-dasharray="70 220">
      <animate attributeName="stroke-dashoffset" from="290" to="0" begin="${begin}s" dur="${dur}s" repeatCount="indefinite"/>
    </path>`;
  };
  const autumnColors = ["#D97A2B", "#B8551F", "#E8A65A"];
  const paleColors = ["#CFE6FF", "#CFE6FF", "#B7E3FF"];
  const colors = scene.season === "autumn" || scene.season === "summer" ? autumnColors : paleColors;
  const leaf = (x: number, y: number, c: string, dur: number, begin: number) =>
    placedAnimated(
      `translate(${x} ${y})`,
      animated(
        `<ellipse cx="0" cy="0" rx="10" ry="5" fill="${c}"/>`,
        aRotate([0, 360], 0, 0, { dur: dur / 2, ease: false }),
      ),
      aTranslate(
        [
          [0, 0],
          [70, -24],
          [150, 10],
          [70, 26],
          [0, 0],
        ],
        { dur, begin },
      ),
    );
  return (
    gust(96, 180, 1, 2.4) +
    gust(170, 262, 0.8, 2.1, -0.9) +
    gust(60, 330, 0.65, 2.7, -1.6) +
    leaf(238, 208, colors[0], 6, 0) +
    leaf(340, 152, colors[1], 7, -2.5) +
    leaf(190, 300, colors[2], 5.5, -4)
  );
}

/** Smoke haze: a warm tint over everything plus slow, low-contrast drifting bands. */
function hazeOverlay(scene: CastScene): string {
  const night = scene.phase === "night";
  const tint = `<rect x="0" y="0" width="${W}" height="${H}" fill="#C9743A" opacity="${night ? 0.14 : 0.2}"/>`;
  const band = (x: number, y: number, w: number, h: number, o: number, amp: number, dur: number, begin = 0) =>
    placedAnimated(
      `translate(0 0)`,
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#E8C39A" opacity="${o}"/>`,
      aTranslate(
        [
          [0, 0],
          [amp, 0],
          [0, 0],
        ],
        { dur, begin },
      ),
    );
  return (
    tint +
    band(-40, 120, 620, 40, 0.16, 40, 22) +
    band(260, 210, 700, 46, 0.14, -46, 26, -8) +
    band(-80, 300, 560, 44, 0.18, 36, 20, -3)
  );
}

/** The scene's weather ambient, if any. */
export function ambientOverlay(scene: CastScene): string {
  if (scene.hazy) return hazeOverlay(scene);
  switch (scene.weather) {
    case "drizzle":
    case "rain":
    case "heavyRain":
      return rainOverlay(scene);
    case "storm":
      return rainOverlay({ ...scene, weather: "rain" });
    case "snow":
      return snowOverlay();
    case "fog":
      return fogOverlay();
    case "wind":
      return windOverlay(scene);
    default:
      return "";
  }
}

/** Season dressing on the ground (blossoms, leaves, snow patches). */
export function seasonDecor(scene: CastScene): string {
  const night = scene.phase === "night";
  if (scene.weather === "snow" || scene.season === "winter") {
    const f = night ? "#A9BCD6" : "#FFFFFF";
    return `<ellipse cx="180" cy="430" rx="90" ry="12" fill="${f}" opacity="0.8"/><ellipse cx="740" cy="464" rx="110" ry="14" fill="${f}" opacity="0.7"/>`;
  }
  if (scene.season === "spring") {
    const dots = [
      [120, 416],
      [168, 440],
      [96, 452],
      [772, 428],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#F7A8C4" opacity="${night ? 0.5 : 0.9}"/>`)
      .join("");
    return dots + `<circle cx="140" cy="430" r="4" fill="#FFFFFF" opacity="${night ? 0.4 : 0.85}"/>`;
  }
  if (scene.season === "autumn") {
    const leaf = (x: number, y: number, a: number, c: string) =>
      rotEllipse(x, y, 11, 6, a, c, `opacity="${night ? 0.55 : 0.95}"`);
    return leaf(150, 434, 24, "#D97A2B") + leaf(210, 452, -18, "#B8551F") + leaf(110, 460, 40, "#E8A65A");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Set pieces — Cast's world
// ---------------------------------------------------------------------------

export interface HouseOptions {
  lit?: boolean;
  night?: boolean;
  snowRoof?: boolean;
  /** Chimney smoke on by default. */
  noSmoke?: boolean;
}

/**
 * Cast's den-house, origin at ground center. ~156 wide × 170 tall at scale 1.
 * The chimney puffs smoke; the round window can glow warm.
 */
export function house(x: number, y: number, scale: number, o: HouseOptions = {}): string {
  const dim = o.night ? 0.82 : 1;
  const smokePuff = (begin: number) =>
    `<g opacity="0">${animated(
      `<circle cx="38" cy="-168" r="8" fill="#FFFFFF"/>`,
      aTranslate(
        [
          [0, 0],
          [7, -48],
        ],
        { dur: 3.8, begin, ease: false },
      ),
    )}${aOpacity([0, 0.5, 0], { dur: 3.8, begin, ease: false })}</g>`;
  const smoke = o.noSmoke ? "" : smokePuff(0) + smokePuff(-1.3) + smokePuff(-2.6);
  const windowFill = o.lit
    ? `<circle cx="34" cy="-58" r="15" fill="${CAST.yellow}">${aOpacity([0.85, 1, 0.85], { dur: 3 })}</circle>
       <circle cx="34" cy="-58" r="24" fill="${CAST.yellow}" opacity="0.25">${aOpacity([0.15, 0.3, 0.15], { dur: 3 })}</circle>`
    : `<circle cx="34" cy="-58" r="15" fill="#9FB6CE"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${dim}">
    ${smoke}
    <rect x="28" y="-158" width="20" height="48" rx="4" fill="${CAST.woodDeep}"/>
    <rect x="-60" y="-95" width="120" height="95" rx="8" fill="${CAST.wall}"/>
    ${roundedTri(
      [
        [-78, -88],
        [78, -88],
        [0, -170],
      ],
      10,
      CAST.roof,
    )}
    <path d="M -42 0 L -42 -36 A 19 19 0 0 1 -4 -36 L -4 0 Z" fill="${CAST.purple}"/>
    <circle cx="-12" cy="-22" r="3.5" fill="${CAST.cream}"/>
    ${windowFill}
    <circle cx="34" cy="-58" r="15" fill="none" stroke="${CAST.cream}" stroke-width="4.5"/>
    <line x1="34" y1="-71" x2="34" y2="-45" stroke="${CAST.cream}" stroke-width="3"/>
    <line x1="21" y1="-58" x2="47" y2="-58" stroke="${CAST.cream}" stroke-width="3"/>
    ${o.snowRoof ? `<path d="M -66 -94 L 0 -160 L 66 -94" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/><ellipse cx="38" cy="-158" rx="12" ry="5" fill="#FFFFFF"/>` : ""}
  </g>`;
}

/** A porch awning + posts, matching the house style; origin at ground. */
export function porch(x: number, y: number, scale: number): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <line x1="-64" y1="0" x2="-64" y2="-108" stroke="${CAST.wood}" stroke-width="9" stroke-linecap="round"/>
    <line x1="64" y1="0" x2="64" y2="-108" stroke="${CAST.wood}" stroke-width="9" stroke-linecap="round"/>
    <path d="M -84 -104 L 84 -104 L 70 -128 L -70 -128 Z" fill="${CAST.roof}"/>
    <rect x="-84" y="-108" width="168" height="8" rx="4" fill="${CAST.woodDeep}"/>
    <rect x="-80" y="-4" width="160" height="10" rx="5" fill="${CAST.wood}" opacity="0.85"/>
  </g>`;
}

export interface TreeOptions {
  /** Red apples in the crown (late summer / autumn). */
  apples?: boolean;
  /** Animated leaves falling from the crown. */
  fallingLeaves?: boolean;
  night?: boolean;
  /** Trunk width at scale 1 (default 22); an old, thick trunk hides a fox. */
  trunkWidth?: number;
}

/** The apple tree, origin at ground center of the trunk. ~190 tall at scale 1. */
export function appleTree(
  x: number,
  y: number,
  scale: number,
  season: CastScene["season"],
  o: TreeOptions = {},
): string {
  const dim = o.night ? 0.8 : 1;
  const tw = o.trunkWidth ?? 22;
  const trunk = `<rect x="${-tw / 2}" y="-74" width="${tw}" height="76" rx="9" fill="${CAST.wood}"/>
    <path d="M -4 -60 Q -26 -78 -34 -102" stroke="${CAST.wood}" stroke-width="10" stroke-linecap="round" fill="none"/>`;
  if (season === "winter") {
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${dim}">
      ${trunk}
      <path d="M 2 -70 Q 18 -104 8 -136" stroke="${CAST.wood}" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="M 4 -110 Q 28 -122 44 -146" stroke="${CAST.wood}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M -32 -100 Q -44 -122 -40 -140" stroke="${CAST.wood}" stroke-width="7" stroke-linecap="round" fill="none"/>
      <ellipse cx="8" cy="-138" rx="14" ry="5" fill="#FFFFFF" opacity="0.95"/>
      <ellipse cx="-38" cy="-140" rx="11" ry="4.5" fill="#FFFFFF" opacity="0.95"/>
      <ellipse cx="0" cy="-2" rx="34" ry="7" fill="#FFFFFF" opacity="0.8"/>
    </g>`;
  }
  const crownFill = season === "spring" ? "#7FBF7A" : season === "autumn" ? "#E08A3C" : CAST.leafGreen;
  const crownShade = season === "spring" ? "#68A968" : season === "autumn" ? "#C9702A" : CAST.leafDeep;
  const crown = `
    <circle cx="-38" cy="-92" r="38" fill="${crownShade}"/>
    <circle cx="36" cy="-94" r="40" fill="${crownShade}"/>
    <circle cx="0" cy="-118" r="52" fill="${crownFill}"/>
    <circle cx="-24" cy="-96" r="34" fill="${crownFill}"/>`;
  const blossoms =
    season === "spring"
      ? [
          [-30, -122],
          [14, -138],
          [34, -102],
          [-46, -86],
          [4, -96],
        ]
          .map(([bx, by]) => `<circle cx="${bx}" cy="${by}" r="4.5" fill="#F7A8C4"/>`)
          .join("")
      : "";
  const apples = o.apples
    ? [
        [-28, -98],
        [14, -124],
        [34, -86],
      ]
        .map(
          ([ax, ay]) =>
            `<circle cx="${ax}" cy="${ay}" r="7" fill="#E5484D"/><line x1="${ax}" y1="${ay - 7}" x2="${ax + 2}" y2="${ay - 12}" stroke="${CAST.woodDeep}" stroke-width="2"/>`,
        )
        .join("")
    : "";
  const fallingLeaf = (lx: number, delay: number) => {
    const spin = animated(
      `<ellipse cx="0" cy="0" rx="9" ry="4.5" fill="${season === "autumn" ? "#D97A2B" : crownShade}"/>`,
      aRotate([0, 300], 0, 0, { dur: 4, ease: false }),
    );
    const drift = animated(
      `<g transform="translate(${lx} -96)">${spin}</g>`,
      aTranslate(
        [
          [0, 0],
          [-16, 46],
          [8, 96],
        ],
        { dur: 4, begin: delay, ease: false },
      ),
    );
    return `<g opacity="0">${drift}${aOpacity([0, 0.95, 0.95, 0], { dur: 4, begin: delay, keyTimes: [0, 0.08, 0.85, 1], ease: false })}</g>`;
  };
  const falling = o.fallingLeaves ? fallingLeaf(-30, 0) + fallingLeaf(28, -2.1) : "";
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${dim}">${trunk}${crown}${blossoms}${apples}${falling}</g>`;
}

/**
 * Distant mountain range, drawn behind the hills. The left peak stays low so
 * it never rises into the temperature block in the top-left corner; the
 * tallest peak is on the right, clear of the text.
 */
export function mountains(night: boolean): string {
  const fill = night ? "#3B4763" : "#8CA0BE";
  const snow = night ? "#8B9BB8" : "#EDF3FA";
  const peak = (pts: [Pt, Pt, Pt], capScale: number) => {
    const apex = pts[2];
    const cap: [Pt, Pt, Pt] = [
      apex,
      [apex[0] + (pts[0][0] - apex[0]) * capScale, apex[1] + (pts[0][1] - apex[1]) * capScale],
      [apex[0] + (pts[1][0] - apex[0]) * capScale, apex[1] + (pts[1][1] - apex[1]) * capScale],
    ];
    return roundedTri(pts, 14, fill) + roundedTri(cap, 8, snow);
  };
  return (
    peak(
      [
        [-60, GROUND_Y + 6],
        [300, GROUND_Y + 6],
        [130, 268],
      ],
      0.28,
    ) +
    peak(
      [
        [180, GROUND_Y + 6],
        [520, GROUND_Y + 6],
        [360, 236],
      ],
      0.24,
    ) +
    peak(
      [
        [560, GROUND_Y + 6],
        [900, GROUND_Y + 6],
        [730, 196],
      ],
      0.26,
    )
  );
}

/** The pond; frozen in deep winter, with a skate trail. */
export function pond(x: number, y: number, rx: number, frozen: boolean): string {
  if (frozen)
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.17}" fill="#D8EAF6"/>
      <ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.17}" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.7"/>
      <path d="M ${x - rx * 0.6} ${y + 4} Q ${x - rx * 0.2} ${y - 10} ${x + rx * 0.25} ${y + 2} T ${x + rx * 0.7} ${y - 4}" stroke="#FFFFFF" stroke-width="2.5" fill="none" opacity="0.8"/>`;
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.17}" fill="${CAST.blue}" opacity="0.45"/>
    <ellipse cx="${x - rx * 0.3}" cy="${y - 2}" rx="${rx * 0.3}" ry="${rx * 0.05}" fill="#FFFFFF" opacity="0.25"/>`;
}

/** A patch of swaying flowers. */
export function flowerPatch(x: number, y: number): string {
  const colors = [CAST.magenta, CAST.purple, CAST.yellow, CAST.cyan];
  let out = "";
  [0, 1, 2, 3].forEach((i) => {
    const fx = x + i * 34 - 51;
    const fy = y;
    const c = colors[i % colors.length];
    const petals = [0, 1, 2, 3]
      .map((p) => {
        const a = (p * Math.PI) / 2 + Math.PI / 4;
        return `<circle cx="${(Math.cos(a) * 7).toFixed(1)}" cy="${(-24 + Math.sin(a) * 7).toFixed(1)}" r="5.5" fill="${c}"/>`;
      })
      .join("");
    const flower = `
      <line x1="0" y1="0" x2="0" y2="-22" stroke="${CAST.leafDeep}" stroke-width="3.5"/>
      ${petals}
      <circle cx="0" cy="-24" r="4.5" fill="${CAST.yellow}"/>`;
    out += placedAnimated(`translate(${fx} ${fy})`, flower, aRotate([-5, 5, -5], 0, 0, { dur: 2.8, begin: -i * 0.6 }));
  });
  return out;
}

/** A butterfly looping around (cx, cy), wings flapping. */
export function butterfly(cx: number, cy: number, color: string = CAST.magenta): string {
  const wings = animated(
    `<ellipse cx="-7" cy="-4" rx="8" ry="6" fill="${color}"/>
     <ellipse cx="7" cy="-4" rx="8" ry="6" fill="${color}"/>
     <ellipse cx="-6" cy="4" rx="6" ry="4.5" fill="${color}" opacity="0.8"/>
     <ellipse cx="6" cy="4" rx="6" ry="4.5" fill="${color}" opacity="0.8"/>`,
    `<animateTransform attributeName="transform" type="scale" values="1 1;0.25 1;1 1" dur="0.5s" repeatCount="indefinite"/>`,
  );
  const body = `${wings}<ellipse cx="0" cy="0" rx="2.5" ry="8" fill="${CAST.charcoal}"/>`;
  const path = `M 0 0 C 50 -36, 110 -6, 70 26 C 40 50, -30 30, -64 -2 C -40 -30, -24 -18, 0 0`;
  return `<g transform="translate(${cx} ${cy})"><g>${body}<animateMotion path="${path}" dur="9s" repeatCount="indefinite"/></g></g>`;
}

/** Two distant birds crossing the sky. */
export function birds(y: number, dur: number): string {
  const bird = `<path d="M -9 0 Q 0 -8 0 0 Q 9 -8 18 0" stroke="${CAST.charcoal}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  const flight = (offY: number, d: number, begin: number) =>
    `<g>${bird}<animateMotion path="M -80 ${y + offY} C ${W * 0.3} ${y + offY - 24}, ${W * 0.7} ${y + offY + 10}, ${W + 80} ${y + offY - 16}" begin="${begin}s" dur="${d}s" repeatCount="indefinite"/></g>`;
  return flight(0, dur, 0) + flight(26, dur * 1.15, -dur * 0.4);
}

/** A hawk circling far over the mountains. */
export function hawk(cx: number, cy: number): string {
  const shape = `<path d="M -10 0 Q 0 -9 0 0 Q 10 -9 20 0" stroke="${CAST.charcoal}" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  return `<g transform="translate(${cx} ${cy})"><g>${shape}<animateMotion path="M 0 0 C 60 -20, 120 8, 60 26 C 20 38, -50 20, -60 -4 C -40 -22, -20 -10, 0 0" dur="14s" repeatCount="indefinite"/></g></g>`;
}

/** Blinking fireflies over the meadow at night. */
export function fireflies(): string {
  const rand = mulberry(47);
  let out = "";
  for (let i = 0; i < 7; i++) {
    const x = 80 + rand() * (W - 160);
    const y = 320 + rand() * 120;
    const dur = 2 + rand() * 2.4;
    const wander = aTranslate(
      [
        [0, 0],
        [10 + rand() * 14, -(6 + rand() * 10)],
        [0, 0],
      ],
      { dur: dur * 2.1, begin: -rand() * 4 },
    );
    out += placedAnimated(
      `translate(${x.toFixed(0)} ${y.toFixed(0)})`,
      `<circle cx="0" cy="0" r="3" fill="${CAST.yellow}">${aOpacity([0, 0.95, 0], { dur, begin: -rand() * 3, ease: false })}</circle>
       <circle cx="0" cy="0" r="7" fill="${CAST.yellow}" opacity="0.25">${aOpacity([0, 0.3, 0], { dur, begin: -rand() * 3, ease: false })}</circle>`,
      wander,
    );
  }
  return out;
}

/** Zzz floating up from a sleeping fox. */
export function zzz(x: number, y: number): string {
  const z = (size: number, delay: number) =>
    `<g opacity="0">${animated(
      `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="800" fill="#FFFFFF">z</text>`,
      aTranslate(
        [
          [0, 0],
          [14, -52],
        ],
        { dur: 3.6, begin: delay, ease: false },
      ),
    )}${aOpacity([0, 0.9, 0], { dur: 3.6, begin: delay, ease: false })}</g>`;
  return z(22, 0) + z(28, -1.2) + z(34, -2.4);
}

/** A shooting star: rests invisible most of the loop, then streaks. */
export function shootingStar(): string {
  const streak = `<line x1="0" y1="0" x2="46" y2="-15" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="0" r="3.5" fill="#FFFFFF"/>`;
  return `<g opacity="0">
    <g>${streak}<animateMotion path="M 640 46 L 300 158" keyPoints="0;0;1;1" keyTimes="0;0.62;0.74;1" calcMode="linear" dur="8s" repeatCount="indefinite"/></g>
    ${aOpacity([0, 0, 0.95, 0, 0], { dur: 8, keyTimes: [0, 0.62, 0.68, 0.74, 1], ease: false })}
  </g>`;
}

/**
 * A soft rainbow spanning the whole meadow, gently shimmering. Drawn in the
 * farBehind layer so the hills and ground swallow its legs at the horizon.
 */
export function rainbowArc(): string {
  const colors = [CAST.fur, "#FFA94D", CAST.yellow, CAST.leafGreen, CAST.blue, CAST.purple];
  const bands = colors
    .map(
      (c, i) =>
        `<circle cx="420" cy="660" r="${500 - i * 16}" fill="none" stroke="${c}" stroke-width="17" opacity="0.92"/>`,
    )
    .join("");
  const sparkle = (x: number, y: number, begin: number) => `<g opacity="0" transform="translate(${x} ${y})">
    <path d="M 0 -7 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FFFFFF"/>
    ${aOpacity([0, 0.9, 0], { dur: 3.2, begin })}
  </g>`;
  return `<g>
    ${animated(bands, aOpacity([0.78, 0.98, 0.78], { dur: 7 }))}
    ${sparkle(300, 190, 0)}${sparkle(452, 168, -1.2)}${sparkle(560, 210, -2.3)}
  </g>`;
}

/** Wavy heat shimmer above hot ground. */
export function heatShimmer(): string {
  const wave = (x: number, y: number, begin: number) =>
    placedAnimated(
      `translate(${x} ${y})`,
      `<path d="M 0 0 q 8 -10 0 -20 q -8 -10 0 -20" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.3"/>`,
      aTranslate(
        [
          [0, 0],
          [0, -14],
          [0, 0],
        ],
        { dur: 2.2, begin },
      ),
    );
  return wave(150, 392, 0) + wave(210, 398, -0.8) + wave(680, 394, -1.3);
}
