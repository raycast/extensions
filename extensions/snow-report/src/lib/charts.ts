/**
 * SVG graphics for the detail pane, embedded in markdown as data URIs.
 *
 * The mountain panel is a to-scale cross-section of a generated mountain (each resort gets its own),
 * with the modeled snowpack, trees below the tree line and the forecast freezing level. Colors follow Raycast's
 * light/dark appearance. Fonts are macOS system fonts, since Raycast can't load web fonts.
 */
import { environment } from "@raycast/api";
import { isPowder, precipitationNow, skyNow, windNow, type PointForecast } from "./forecast";
import { randomMountain, random, hash } from "./mountain";
import {
  formatElevation,
  formatRain,
  formatSnow,
  formatTemp,
  formatTempShort,
  formatWindAndGusts,
  snowNumber,
  snowUnit,
} from "./units";

const WIDTH = 440;
const SANS = `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
// DIN reads like ski area signage, and ships with macOS.
const DISPLAY = `'DIN Condensed', 'Helvetica Neue', sans-serif`;
const FIGURES = `'DIN Alternate', 'Helvetica Neue', sans-serif`;

const LIGHT = {
  ink: "#17324d",
  muted: "#5b7086",
  snow: "#e6eef5",
  rock: "#3d4f61",
  // Background ridges fade toward the sky with distance.
  ridgeFar: "#d5dee6",
  ridgeNear: "#b3c1ce",
  tree: "#2f5148",
  treeDark: "#203d36",
  onRock: "#e9f0f6",
  onRockMuted: "#a9b9c8",
  ridge: "#17324d",
  freezing: "#e8590c",
  // Label shades of the line's orange, tuned for contrast on rock and on sky.
  freezingOnRock: "#ffa066",
  freezingOnSky: "#c2410c",
  base: "#9dbad3",
  summit: "#17324d",
  today: "rgba(23,50,77,0.06)",
  // Backing for labels drawn over terrain, like a map's label halo.
  chip: "rgba(246,247,249,0.9)",
  onInk: "#ffffff",
  flake: "#7f98b0",
  rain: "#5f86ad",
  sun: "#f2b84b",
  moon: "#c9d3dd",
  cloud: "#d9e1e8",
  fog: "#ffffff",
  fogOpacity: 0.85,
  wind: "rgba(23,50,77,0.45)",
  // Warnings only (high wind); orange stays reserved for the freezing line.
  alert: "#ff8a80",
};
const DARK = {
  ink: "#e8f0f7",
  muted: "#8fa3b6",
  snow: "#c9d8e6",
  rock: "#34475c",
  ridgeFar: "#2e3541",
  ridgeNear: "#38434f",
  tree: "#2a4a42",
  treeDark: "#1e3832",
  onRock: "#e8f0f7",
  onRockMuted: "#8fa3b6",
  ridge: "#c9d8e6",
  freezing: "#ff7a2e",
  freezingOnRock: "#ff9a5c",
  freezingOnSky: "#ff8a45",
  base: "#5c7a96",
  summit: "#dce8f3",
  today: "rgba(232,240,247,0.07)",
  chip: "rgba(32,34,38,0.88)",
  onInk: "#17324d",
  flake: "#e3ebf3",
  rain: "#86acd1",
  sun: "#f4c86a",
  moon: "#e6ecf2",
  cloud: "#4a5563",
  fog: "#b8c4d0",
  fogOpacity: 0.55,
  wind: "rgba(232,240,247,0.45)",
  alert: "#ff7b72",
};
type Theme = typeof LIGHT;
const theme = (): Theme => (environment.appearance === "dark" ? DARK : LIGHT);

export type Column = { title: string; color: "base" | "summit"; point: PointForecast };

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const span = (value: string, attrs: string) => `<tspan ${attrs}>${escape(value)}</tspan>`;
const text = (x: number, y: number, content: string, attrs = "") =>
  `<text x="${x}" y="${y}" ${attrs}>${content}</text>`;

function toMarkdown(svg: string, height: number): string {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" font-family="${SANS}">${svg}</svg>`;
  return `![](data:image/svg+xml;base64,${Buffer.from(doc).toString("base64")})`;
}

/** A snow amount as a number with a smaller unit, e.g. "12" + "cm". */
function amount(cm: number | null, size: number, font: string, t: Theme): string {
  if (cm === null) return span("–", `font-family="${font}" font-size="${size}" fill="${t.ink}"`);
  return (
    span(snowNumber(cm), `font-family="${font}" font-size="${size}" font-weight="700" fill="${t.ink}"`) +
    span(snowUnit(), `dx="2" font-size="${Math.round(size * 0.36 + 6)}" fill="${t.muted}"`)
  );
}

/** Headline next-24h snow plus three totals, for one point. Takes 78px below the title baseline. */
function snowBlock(x: number, y: number, title: string, p: PointForecast, t: Theme): string {
  const totals: [string, number | null][] = [
    ["past 24 h", p.last24h],
    ["next 72 h", p.next72h],
    ["next 7 days", p.next7d],
  ];
  return [
    text(
      x,
      y,
      span(title, `font-size="13" font-weight="600" fill="${t.ink}"`) +
        span("next 24 hours", `dx="6" font-size="12" fill="${t.muted}"`),
    ),
    text(x, y + 42, amount(p.next24h, 44, DISPLAY, t)),
    ...totals.flatMap(([label, value], i) => [
      text(x + i * 62, y + 64, amount(value, 16, FIGURES, t)),
      text(x + i * 62, y + 78, escape(label), `font-size="11" fill="${t.muted}"`),
    ]),
    // Right-aligned beside the headline number.
    isPowder(p)
      ? `<rect x="${x + 102}" y="${y + 20}" width="86" height="18" rx="9" fill="${t.ink}"/>` +
        text(x + 145, y + 33, "Fresh powder", `font-size="11" font-weight="600" text-anchor="middle" fill="${t.onInk}"`)
      : "",
  ].join("");
}

/** Current conditions as label/value rows, for the rock layer. The mountain labels freezing level on its line. */
function conditionRows(x: number, y: number, width: number, p: PointForecast, t: Theme, withFreezing = false): string {
  const rows: [string, string][] = [
    ["Now", nowText(p)],
    ["Temperature", formatTemp(p.temperature)],
    ["Wind", formatWindAndGusts(p.windSpeed, p.windGusts)],
    ["Snow, past 7 days", formatSnow(p.last7d)],
  ];
  if (withFreezing) rows.push(["Freezing level", formatElevation(p.freezingLevel)]);
  // High wind is flagged by relabeling its row in the alert color.
  const high = windNow(p) === "high";
  return rows
    .map(([label, value], i) => {
      const ry = y + i * 18;
      const alert = high && label === "Wind";
      return (
        text(
          x,
          ry,
          alert ? "High wind" : escape(label),
          `font-size="11.5" fill="${alert ? t.alert : t.onRockMuted}"${alert ? ' font-weight="600"' : ""}`,
        ) +
        text(
          x + width,
          ry,
          escape(value),
          `font-size="11.5" font-weight="${alert ? 600 : 500}" text-anchor="end" fill="${alert ? t.alert : t.onRock}"`,
        )
      );
    })
    .join("");
}

/** What it's doing now: precipitation first, otherwise the sky. Short enough for a 188px column. */
function nowText(p: PointForecast): string {
  const lowVis = skyNow(p) === "fog";
  switch (precipitationNow(p)) {
    case "snow":
      return lowVis ? "Snowing, low visibility" : `Snowing, ${formatSnow(p.snowNow)}/h`;
    case "rain":
      return lowVis ? "Raining, low visibility" : `Raining, ${formatRain(p.rainNow)}/h`;
    case "mixed":
      return "Snow and rain";
  }
  const night = p.isDay === false;
  switch (skyNow(p)) {
    case "clear":
      return night ? "Clear" : "Bluebird";
    case "mostly-clear":
      return night ? "Mostly clear" : "Mostly sunny";
    case "partly-cloudy":
      return "Partly cloudy";
    case "overcast":
      return "Overcast";
    case "fog":
      return "Low visibility";
    default:
      return "–";
  }
}

const CLOUDS = { clear: 0, "mostly-clear": 1, "partly-cloudy": 2, overcast: 4, fog: 0 };

/** A sun or moon when either point has a clear sky, drawn behind the ridges and away from the peak. */
function sunOrMoon(base: PointForecast, summit: PointForecast, peakX: number, t: Theme): string {
  const clear = (p: PointForecast) => skyNow(p) === "clear" || skyNow(p) === "mostly-clear";
  const p = clear(summit) ? summit : clear(base) ? base : undefined;
  if (!p) return "";
  const x = [0.12, 0.3, 0.48]
    .map((f) => f * WIDTH)
    .reduce((best, c) => (Math.abs(c - peakX) > Math.abs(best - peakX) ? c : best));
  const y = TERRAIN_TOP - 6;
  return p.isDay === false
    ? `<circle cx="${x}" cy="${y}" r="8" fill="${t.moon}"/>`
    : `<circle cx="${x}" cy="${y}" r="18" fill="${t.sun}" opacity="0.22"/><circle cx="${x}" cy="${y}" r="11" fill="${t.sun}"/>`;
}

/** Drifting clouds by cloud cover. */
function clouds(p: PointForecast, x0: number, x1: number, seed: string, t: Theme): string {
  const sky = skyNow(p);
  if (!sky) return "";
  const rand = random(hash(seed));
  const drift = (dx: number, dur: number) =>
    `<animateTransform attributeName="transform" type="translate" values="0,0;${dx},0;0,0" dur="${dur.toFixed(1)}s" repeatCount="indefinite"/>`;
  const out: string[] = [];
  for (let i = 0; i < CLOUDS[sky]; i++) {
    const [cx, cy, w] = [x0 + 30 + rand() * (x1 - x0 - 60), PRECIP_TOP + 18 + rand() * 26, 26 + rand() * 22];
    const puffs = [
      [cx - w * 0.45, cy + 2, w * 0.32],
      [cx, cy - 4, w * 0.42],
      [cx + w * 0.45, cy + 2, w * 0.3],
    ];
    out.push(
      `<g opacity="0.92">${puffs.map(([x, y, r]) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * 0.62)}" fill="${t.cloud}"/>`).join("")}${drift(10 + rand() * 10, 18 + rand() * 12)}</g>`,
    );
  }
  return out.join("");
}

/**
 * Low visibility as a translucent layer across the full width at the foggy point's height, with
 * soft top and bottom edges: summit fog sits high, base fog low, both together cover the mountain.
 */
function fogLayer(base: PointForecast, summit: PointForecast, by: number, sy: number, t: Theme): string {
  const [low, high] = [skyNow(base) === "fog", skyNow(summit) === "fog"];
  if (!low && !high) return "";
  const top = high ? sy - 34 : by - 50;
  const bottom = Math.min(GROUND_Y, low ? by + 18 : sy + 50);
  const stop = (offset: number, opacity: number) =>
    `<stop offset="${offset}" stop-color="${t.fog}" stop-opacity="${opacity}"/>`;
  return (
    `<defs><linearGradient id="fog" x1="0" y1="0" x2="0" y2="1">` +
    `${stop(0, 0)}${stop(0.3, t.fogOpacity)}${stop(0.7, t.fogOpacity)}${stop(1, 0)}</linearGradient></defs>` +
    `<rect y="${Math.round(top)}" width="${WIDTH}" height="${Math.round(bottom - top)}" fill="url(#fog)">` +
    `<animate attributeName="opacity" values="0.85;1;0.85" dur="8s" repeatCount="indefinite"/></rect>`
  );
}

/**
 * Falling snow or rain over the sky between x0 and x1, sized by the current hour's amount.
 * Particles are split into a few layers at different speeds. Each layer is drawn twice, one copy a
 * full fall above the other, and one animation slides the pair down so the loop is seamless. One
 * animation per layer instead of per particle keeps the image small. Without animation support it
 * reads as a still picture of falling snow or rain.
 */
function precipitation(p: PointForecast, x0: number, x1: number, id: string, seed: string, t: Theme): string {
  const kind = precipitationNow(p);
  if (!kind || kind === "dry") return "";
  const rand = random(hash(`${seed}/${id}`));
  const [top, fall] = [PRECIP_TOP, GROUND_Y - PRECIP_TOP];
  const layer = (
    name: string,
    count: number,
    dur: number,
    drift: number,
    particle: (x: number, y: number) => string,
  ) => {
    let dots = "";
    for (let i = 0; i < count; i++) dots += particle(x0 + rand() * (x1 - x0), top + rand() * fall);
    return (
      `<g><g id="${name}">${dots}</g><use href="#${name}" transform="translate(${-drift},${-fall})"/>` +
      `<animateTransform attributeName="transform" type="translate" from="0,0" to="${drift},${fall}" dur="${dur}s" repeatCount="indefinite"/></g>`
    );
  };
  const flake = (x: number, y: number) =>
    `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="${f1(1.2 + rand() * 1.2)}"/>`;
  const drop = (x: number, y: number) => `<path d="M${Math.round(x)},${Math.round(y)}l-2,8"/>`;

  const flakes = kind === "rain" ? 0 : Math.round(Math.min(36, 9 + 18 * (p.snowNow ?? 0)));
  const drops = kind === "snow" ? 0 : Math.round(Math.min(40, 12 + 10 * (p.rainNow ?? 0)));
  const snow = [7, 9.5, 12].map((dur, i) => layer(`${id}-s${i}`, Math.round(flakes / 3), dur, 6, flake)).join("");
  const rain = [0.9, 1.2].map((dur, i) => layer(`${id}-r${i}`, Math.round(drops / 2), dur, -fall / 4, drop)).join("");
  return (
    (flakes ? `<g fill="${t.flake}">${snow}</g>` : "") +
    (drops ? `<g stroke="${t.rain}" stroke-width="1.3" stroke-linecap="round">${rain}</g>` : "")
  );
}

/**
 * Spindrift: fine streaks of blown snow streaming across the sky between x0 and x1, in two layers at
 * different speeds. Like the precipitation, each layer is drawn twice, one copy a full width behind,
 * and one animation slides the pair along so the stream is continuous.
 */
function windStreaks(p: PointForecast, x0: number, x1: number, id: string, seed: string, t: Theme): string {
  const wind = windNow(p);
  if (wind !== "windy" && wind !== "high") return "";
  const rand = random(hash(`${seed}/${id}`));
  const span = x1 - x0;
  const layer = (name: string, count: number, dur: number) => {
    let streaks = "";
    for (let i = 0; i < count; i++) {
      const [x, y, len] = [x0 + rand() * span, PRECIP_TOP + 8 + rand() * 120, 5 + rand() * 9];
      streaks += `<path d="M${Math.round(x)},${Math.round(y)}h${f1(len)}"/>`;
    }
    return (
      `<g><g id="${name}">${streaks}</g><use href="#${name}" transform="translate(${-span},-12)"/>` +
      `<animateTransform attributeName="transform" type="translate" from="0,0" to="${span},12" dur="${dur}s" repeatCount="indefinite"/></g>`
    );
  };
  const high = wind === "high";
  return (
    `<g clip-path="url(#${id}-clip)"><clipPath id="${id}-clip"><rect x="${x0}" width="${span}" height="${GROUND_Y}"/></clipPath>` +
    `<g stroke="${t.wind}" stroke-width="1.1" stroke-linecap="round">` +
    `${layer(`${id}-a`, high ? 16 : 8, high ? 1.4 : 2.6)}${layer(`${id}-b`, high ? 12 : 6, high ? 2.2 : 3.8)}</g></g>`
  );
}

/**
 * Rough snow on the ground (cm) for drawing only. The model's depth can read 0 just after a snowy week,
 * so the week's snowfall counts too.
 */
const snowOnGround = (p: PointForecast) => Math.max(p.snowDepth ?? 0, p.last7d ?? 0);

/** Snow streaming off the summit downwind (to the right) in high wind with snow on the ground. */
function summitPlume(p: PointForecast, sx: number, sy: number, t: Theme): string {
  if (windNow(p) !== "high" || !snowOnGround(p)) return "";
  const streams = [
    [4, 26, 2.5, 0.75],
    [7, 40, 2, 0.5],
    [10, 54, 1.5, 0.3],
  ];
  return streams
    .map(
      ([dy, len, w, o]) =>
        `<path d="M${Math.round(sx + 2)},${Math.round(sy + dy)}q${len / 2},-4 ${len},${dy / 2}" fill="none" stroke="${t.snow}" stroke-width="${w}" stroke-linecap="round" opacity="${o}">` +
        `<animate attributeName="opacity" values="${o};${o / 3};${o}" dur="1.6s" repeatCount="indefinite"/></path>`,
    )
    .join("");
}

/** "Freezing level 1,430 m" in the line's orange, on rock or on the sky. */
function freezingText(level: number, t: Theme, note = "", onRock = true): string {
  const fill = onRock ? t.freezingOnRock : t.freezingOnSky;
  return (
    span("Freezing level", `fill="${fill}"`) +
    span(formatElevation(level) + note, `dx="4" font-weight="600" fill="${fill}"`)
  );
}

// Terrain occupies TERRAIN_TOP..GROUND_Y, below the two snow blocks.
const TERRAIN_TOP = 136;
const GROUND_Y = 284;
// Rain and snow fall from just below the snow blocks.
const PRECIP_TOP = 104;
const TREE_GAP = [5, 8];
const TREE_HEIGHTS = [10, 13, 16];
const TREE_ROWS = 5;

/** How far trees lean (degrees) at each wind level. */
const SWAY = { calm: 0, windy: 4, high: 9 };

/**
 * Each tree style is defined once and reused: three sizes, two greens, bare or snow-capped.
 * A two-tier conifer with its base at (0, 0). In wind each style sways on its own timing (a skew
 * that moves the top and keeps the base planted), so the forest doesn't move in lockstep.
 */
function treeDefs(t: Theme, wind: PointForecast): string {
  const level = windNow(wind) ?? "calm";
  const lean = SWAY[level];
  let defs = "";
  let k = 0;
  TREE_HEIGHTS.forEach((h, size) =>
    [t.tree, t.treeDark].forEach((fill, shade) =>
      [false, true].forEach((snowy) => {
        const w = h * 0.62;
        const body = `M${f1(-w / 2)},0L0,${f1(-h * 0.62)}L${f1(w / 2)},0ZM${f1(-w * 0.38)},${f1(-h * 0.38)}L0,${f1(-h)}L${f1(w * 0.38)},${f1(-h * 0.38)}Z`;
        const cap = snowy
          ? `<path d="M${f1(-w * 0.22)},${f1(-h * 0.66)}L0,${f1(-h)}L${f1(w * 0.22)},${f1(-h * 0.66)}Z" fill="${t.snow}"/>`
          : "";
        const dur = f1((level === "high" ? 0.9 : 1.6) + (k++ % 5) * 0.17);
        const sway = lean
          ? `<animateTransform attributeName="transform" type="skewX" values="0;${-lean};${f1(lean * 0.3)};${-lean};0" dur="${dur}s" repeatCount="indefinite"/>`
          : "";
        defs += `<g id="t${size}${shade}${snowy ? 1 : 0}"><path d="${body}" fill="${fill}"/>${cap}${sway}</g>`;
      }),
    ),
  );
  return defs;
}

/**
 * A label on a rounded backing so it stays readable over ridges. Width is estimated from the
 * character count, and the chip is kept inside the panel.
 */
function chip(
  x: number,
  y: number,
  content: string,
  chars: number,
  t: Theme,
  anchor: "start" | "middle" | "end",
  charWidth = 6.4,
) {
  const width = chars * charWidth + 12;
  const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  const x0 = Math.min(WIDTH - 2 - width, Math.max(2, left));
  return (
    `<rect x="${f1(x0)}" y="${f1(y - 11)}" width="${f1(width)}" height="15" rx="4" fill="${t.chip}"/>` +
    text(x0 + 6, y, content)
  );
}

const f1 = (n: number) => n.toFixed(1);

/** Smooth curve through the points (Catmull-Rom as cubic Béziers), in whole pixels to keep the image small. */
function curve(pts: [number, number][], move = true): string {
  const r = Math.round;
  let d = `${move ? "M" : "L"}${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1] ?? pts[i], pts[i], pts[i + 1], pts[i + 2] ?? pts[i + 1]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`;
  }
  return d;
}

/** Rough tree line from latitude: about 1,750 m at 50°, 2,100 m at 45°, 1,000 m at 60°. */
const treeLine = (lat: number) => Math.max(0, 4000 - 75 * (Math.abs(lat) - 20));

const nearest = (values: number[], target: number, from: number, to: number) => {
  let best = from;
  for (let i = from; i < to; i++) if (Math.abs(values[i] - target) < Math.abs(values[best] - target)) best = i;
  return best;
};

/**
 * Base and summit side by side above a to-scale mountain. Never averaged.
 * The skyline is generated per resort; base, summit, snowpack and freezing level sit at true heights on it.
 */
export function mountainPanel(
  base: PointForecast,
  summit: PointForecast,
  resort: { name: string; country: string; lat: number },
): string {
  const t = theme();
  const vertical = summit.elevation - base.elevation || 1;
  // Seeded by name and country, so a resort keeps its mountain even if the data's ids change.
  const seed = `${resort.name}|${resort.country}`;
  const mountain = randomMountain(seed);
  const toElevation = (h: number) => base.elevation + h * vertical;
  const profile = mountain.profile.map(toElevation);
  const xs = profile.map((_, i) => (i / (profile.length - 1)) * WIDTH);
  const ridges = mountain.ridges.map((r) => r.map(toElevation));

  // One vertical scale for everything, padded so the valley floor sits above the rock layer.
  const all = [...profile, ...ridges.flat(), base.elevation, summit.elevation];
  const [lo, hi] = [Math.min(...all), Math.max(...all)];
  const eMin = lo - (hi - lo) * 0.06;
  const yFor = (e: number) => GROUND_Y - ((e - eMin) / (hi - eMin || 1)) * (GROUND_Y - TERRAIN_TOP);
  const surface: [number, number][] = profile.map((e, i) => [xs[i], yFor(e)]);
  const ground = `${curve(surface)} L${WIDTH},${GROUND_Y} L0,${GROUND_Y} Z`;

  // Background ridges, raised a little and paler with distance.
  const ridgeLayers = ridges.map((r, i) => {
    const lift = (ridges.length - i) * 9;
    const pts: [number, number][] = r.map((e, j) => [(j / (r.length - 1)) * WIDTH, yFor(e) - lift]);
    return `<path d="${curve(pts)} L${WIDTH},${GROUND_Y} L0,${GROUND_Y} Z" fill="${i === 0 ? t.ridgeFar : t.ridgeNear}"/>`;
  });

  // Snowpack, interpolated by elevation between base and summit.
  const thickness = (cm: number) => (cm ? Math.min(14, Math.max(2, 1.1 * Math.sqrt(cm))) : 0);
  const [tBase, tSummit] = [thickness(snowOnGround(base)), thickness(snowOnGround(summit))];
  const at = (e: number) => tBase + (tSummit - tBase) * Math.min(1, Math.max(0, (e - base.elevation) / vertical));
  const under: [number, number][] = surface.map(([x, y], i) => [x, y + at(profile[i])]);
  const snowpack =
    tBase || tSummit ? `<path d="${curve(surface)} ${curve([...under].reverse(), false)} Z" fill="${t.snow}"/>` : "";

  // Conifers on the slope below the tree line, thinning out as they approach it.
  const rand = random(hash(`${seed}/trees`));
  const surfaceAt = (x: number) => {
    const i = Math.min(surface.length - 2, xs.findIndex((sx, k) => k > 0 && sx >= x) - 1);
    const [[x1, y1], [x2, y2]] = [surface[Math.max(0, i)], surface[Math.max(0, i) + 1]];
    return y1 + ((x - x1) / (x2 - x1 || 1)) * (y2 - y1);
  };
  const lineY = yFor(treeLine(resort.lat));
  // Snow-capped wherever that part of the mountain has snow on the ground.
  const snowyAt = (x: number) => at(profile[Math.round((x / WIDTH) * (profile.length - 1))]) > 0;
  const trees: [number, string][] = [];
  for (let x = 4; x < WIDTH - 4; x += TREE_GAP[0] + rand() * (TREE_GAP[1] - TREE_GAP[0])) {
    const y = surfaceAt(x);
    const steep = Math.abs(surfaceAt(x + 3) - surfaceAt(x - 3)) / 6 > 1.6;
    if (steep || y < lineY) continue;
    // Forest several rows deep down the slope, thinning out toward the tree line.
    const density = Math.min(1, (y - lineY) / 25);
    for (let row = 0; row < TREE_ROWS; row++) {
      if (rand() > density * (1 - row * 0.12)) continue;
      const ty = y + 4 + row * (7 + rand() * 4);
      if (ty > GROUND_Y - 1) break;
      const style = `t${Math.floor(rand() * 3)}${rand() < 0.5 ? 0 : 1}${snowyAt(x) ? 1 : 0}`;
      trees.push([ty, `<use href="#${style}" x="${Math.round(x)}" y="${Math.round(ty)}"/>`]);
    }
  }
  trees.sort((a, b) => a[0] - b[0]);

  // Spot heights: the summit is the skyline's highest point; the base is where the valley floor left
  // of it meets the slope (the last point within 4% of the lowest ground).
  const iSummit = profile.indexOf(Math.max(...profile));
  const floor = profile[nearest(profile, base.elevation, 0, iSummit)];
  const iBase = profile.slice(0, iSummit).findLastIndex((e) => e <= floor + 0.04 * vertical);
  const [sx, sy] = surface[iSummit];
  const [bx, by] = surface[iBase];
  const [summitLabel, baseLabel] = [formatElevation(summit.elevation), formatElevation(base.elevation)];

  // One freezing level for the mountain, from the summit point (the free atmosphere above the resort).
  const level = summit.freezingLevel;
  const line =
    level === null
      ? undefined
      : freezingLine(
          level,
          yFor(level),
          profile.map((e) => e > level),
          xs,
          t,
        );
  const footnote = level !== null && !line;
  const [lineSvg, lineLabel] = line ?? ["", ""];
  const height = GROUND_Y + (footnote ? 114 : 96);
  // State the gap, so "3,230 m" can't be read as 3,230 m above the summit.
  const note =
    level === null
      ? ""
      : level > summit.elevation
        ? `, ${formatElevation(level - summit.elevation)} above the summit`
        : `, ${formatElevation(base.elevation - level)} below the base`;

  const parts = [
    // The ground shape is defined once and reused for the fill, the clip and the sky mask.
    `<defs>${treeDefs(t, base)}<path id="ground" d="${ground}"/><clipPath id="m"><use href="#ground"/></clipPath>` +
      `<mask id="sky"><rect y="${PRECIP_TOP}" width="${WIDTH}" height="${GROUND_Y - PRECIP_TOP}" fill="white"/><use href="#ground" fill="black"/></mask></defs>`,
    sunOrMoon(base, summit, sx, t),
    ...ridgeLayers,
    `<use href="#ground" fill="${t.rock}"/>`,
    snowpack,
    ...trees.map(([, d]) => d),
    // What's falling now: base conditions over the left half of the sky, summit over the right.
    `<g mask="url(#sky)">${precipitation(base, 0, WIDTH / 2, "pb", seed, t)}${precipitation(summit, WIDTH / 2, WIDTH, "ps", seed, t)}</g>`,
    lineSvg,
    `<path d="${curve(surface)}" fill="none" stroke="${t.ridge}" stroke-width="1.5" stroke-linejoin="round"/>`,
    summitPlume(summit, sx, sy, t),
    `<g mask="url(#sky)">${windStreaks(base, 0, WIDTH / 2, "wb", seed, t)}${windStreaks(summit, WIDTH / 2, WIDTH, "ws", seed, t)}</g>`,
    // Clouds and fog sit in front of the mountain but behind the labels.
    clouds(base, 0, WIDTH / 2, `${seed}/base-sky`, t),
    clouds(summit, WIDTH / 2, WIDTH, `${seed}/summit-sky`, t),
    fogLayer(base, summit, by, sy, t),
    `<path d="M${f1(sx - 5)},${f1(sy - 3)} l5,-8 l5,8 z" fill="${t.ink}"/>`,
    chip(sx, sy - 16, span(summitLabel, `font-size="11" fill="${t.ink}"`), summitLabel.length, t, "middle"),
    `<circle cx="${f1(bx)}" cy="${f1(by - 1)}" r="3.5" fill="${t.ink}"/>`,
    chip(bx, by - 10, span(baseLabel, `font-size="11" fill="${t.ink}"`), baseLabel.length, t, "middle"),
    // Labels last, so no ridge or tree is drawn over them.
    lineLabel,
    snowBlock(16, 18, "Base", base, t),
    snowBlock(236, 18, "Summit", summit, t),
    `<rect x="0" y="${GROUND_Y}" width="${WIDTH}" height="${height - GROUND_Y}" fill="${t.rock}"/>`,
    conditionRows(16, GROUND_Y + 24, 188, base, t),
    conditionRows(236, GROUND_Y + 24, 188, summit, t),
    footnote ? text(16, height - 14, freezingText(level, t, note), `font-size="11.5"`) : "",
  ];
  return toMarkdown(parts.join(""), height);
}

/**
 * The dashed freezing line across the ground, labeled once beside its longest visible stretch.
 * Returns [line, label] so the label can be drawn above everything else, or undefined when the line
 * doesn't touch the terrain at all.
 */
function freezingLine(
  level: number,
  y: number,
  above: boolean[],
  xs: number[],
  t: Theme,
): [string, string] | undefined {
  const LABEL_WIDTH = 140;
  const MIN_LINE = 40;
  // Longest run of ground above the freezing level.
  let [start, end, best] = [-1, -1, 0];
  for (let i = 0, runStart = -1; i <= above.length; i++) {
    if (above[i] && runStart < 0) runStart = i;
    if (!above[i] && runStart >= 0) {
      if (xs[i - 1] - xs[runStart] >= best) [start, end, best] = [xs[runStart], xs[i - 1], xs[i - 1] - xs[runStart]];
      runStart = -1;
    }
  }
  if (start < 0 || y > GROUND_Y) return undefined;

  const dash = (x1: number, x2: number, clip: boolean) =>
    `<line x1="${f1(x1)}" x2="${f1(x2)}" y1="${f1(y)}" y2="${f1(y)}" stroke="${t.freezing}" stroke-width="2.5" stroke-dasharray="6 3"${clip ? ' clip-path="url(#m)"' : ""}/>`;

  // Long stretch with rock below: label underneath, on the rock.
  if (end - start > LABEL_WIDTH + 30 && y + 18 < GROUND_Y) {
    return [dash(0, WIDTH, true), text(start + 18, y + 16, freezingText(level, t), `font-size="11.5"`)];
  }
  // Short stretch near a peak: extend the line into the sky to a label, so it's always visible.
  const leftRoom = start - 30 > LABEL_WIDTH;
  const labelX = leftRoom ? start - 30 : end + 30;
  const [x1, x2] = leftRoom
    ? [labelX + 6, Math.max(end, start + MIN_LINE)]
    : [Math.min(start, end - MIN_LINE), labelX - 6];
  return [
    dash(x1, x2, false),
    chip(
      labelX,
      y + 4,
      `<tspan font-size="11.5">${freezingText(level, t, "", false)}</tspan>`,
      `Freezing level ${formatElevation(level)}`.length,
      t,
      leftRoom ? "end" : "start",
      6.1,
    ),
  ];
}

/** One point without a mountain, for resorts with no base or summit elevation. */
export function singlePanel(p: PointForecast): string {
  const t = theme();
  const height = 228;
  const parts = [
    snowBlock(16, 22, `Model terrain, ${formatElevation(p.elevation)}`, p, t),
    `<rect x="0" y="112" width="${WIDTH}" height="${height - 112}" fill="${t.rock}"/>`,
    conditionRows(16, 138, WIDTH - 32, p, t, true),
  ];
  return toMarkdown(parts.join(""), height);
}

const dayLabel = (date: string, i: number) =>
  i === 0 ? "Today" : new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

/** Daily snowfall bars per column, with each column's low/high temperatures underneath. */
export function outlookChart(columns: Column[]): string {
  const t = theme();
  const days = columns[0].point.days;
  const top = 46;
  const baseline = 150;
  const tempRow = 190;
  const keyRow = tempRow + 15 * columns.length + 10;
  const height = keyRow + 4;
  const slot = WIDTH / days.length;
  const barW = Math.min(16, (slot - 18) / columns.length);
  const max = Math.max(1, ...columns.flatMap((c) => c.point.days.map((d) => d.snowfall ?? 0)));
  const noSnow = columns.every((c) => c.point.days.every((d) => !d.snowfall));

  const parts = [
    text(0, 18, span("Snowfall over the next 7 days", `font-size="13" font-weight="600" fill="${t.ink}"`)),
    `<rect x="2" y="${top - 14}" width="${slot - 4}" height="${keyRow - 24 - top + 14}" rx="6" fill="${t.today}"/>`,
    `<line x1="0" x2="${WIDTH}" y1="${baseline}" y2="${baseline}" stroke="${t.muted}" stroke-opacity="0.35"/>`,
  ];

  days.forEach((day, i) => {
    const cx = slot * i + slot / 2;
    const groupX = cx - (barW * columns.length + 3 * (columns.length - 1)) / 2;
    // Value labels sit above their bars; when two would collide at similar heights, stack them.
    const labels: { x: number; y: number; snow: number }[] = [];
    columns.forEach((c, j) => {
      const snow = c.point.days[i]?.snowfall;
      const x = groupX + j * (barW + 3);
      if (snow === null || snow === undefined) {
        parts.push(text(x + barW / 2, baseline - 4, "–", `font-size="10" text-anchor="middle" fill="${t.muted}"`));
      } else if (snow > 0) {
        const h = Math.max(2, ((baseline - top - 16) * snow) / max);
        parts.push(`<rect x="${x}" y="${baseline - h}" width="${barW}" height="${h}" rx="2" fill="${t[c.color]}"/>`);
        labels.push({ x: x + barW / 2, y: baseline - h - 4, snow });
      }
    });
    if (labels.length === 2 && Math.abs(labels[0].y - labels[1].y) < 12) {
      labels[0].y = Math.min(labels[0].y, labels[1].y) - 11;
    }
    for (const { x, y, snow } of labels) {
      parts.push(
        text(
          x,
          y,
          span(snowNumber(snow), `font-family="${FIGURES}" font-size="11" fill="${t.ink}"`) +
            span(snowUnit(), `dx="1" font-size="8" fill="${t.muted}"`),
          `text-anchor="middle"`,
        ),
      );
    }
    parts.push(
      text(
        cx,
        baseline + 18,
        escape(dayLabel(day.date, i)),
        `font-size="11" font-weight="600" text-anchor="middle" fill="${t.ink}"`,
      ),
    );
    // Low / high per column; the last column (summit) in ink, earlier ones muted.
    columns.forEach((c, j) => {
      const d = c.point.days[i];
      const temps = d ? `${formatTempShort(d.tempMin)} / ${formatTempShort(d.tempMax)}` : "–";
      parts.push(
        text(
          cx,
          tempRow + j * 15,
          escape(temps),
          `font-family="${FIGURES}" font-size="11" text-anchor="middle" fill="${j === columns.length - 1 ? t.ink : t.muted}"`,
        ),
      );
    });
  });

  // Key, left to right: a swatch per column, then what the temperature rows mean.
  let kx = 0;
  for (const c of columns) {
    parts.push(`<rect x="${kx}" y="${keyRow - 9}" width="9" height="9" rx="2" fill="${t[c.color]}"/>`);
    parts.push(text(kx + 14, keyRow, escape(c.title), `font-size="11" fill="${t.muted}"`));
    kx += 14 + c.title.length * 7.5 + 14;
  }
  parts.push(
    text(
      kx,
      keyRow,
      escape(
        columns.length > 1 ? "Temperatures: daily low / high, base above summit" : "Temperatures: daily low / high",
      ),
      `font-size="11" fill="${t.muted}"`,
    ),
  );

  if (noSnow) {
    parts.push(
      text(
        WIDTH / 2,
        (top + baseline) / 2 + 4,
        "No snow in the forecast",
        `font-size="12" text-anchor="middle" fill="${t.muted}"`,
      ),
    );
  }

  return toMarkdown(parts.join(""), height);
}
