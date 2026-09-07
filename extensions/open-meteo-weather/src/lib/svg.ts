import type { GlyphKind } from "./palettes";
import type { HeroStyle } from "./themes";
import { escapeXml, markdownAlt } from "./text";
import { FetchedTile, TILE_PX } from "./tiles";

const W = 840;
const H = 490;
const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif`;

export interface HeroChartPoint {
  /** Short hour label, e.g. "14h" — only rendered for some points */
  label: string;
  temp: number;
}

export interface HeroOptions {
  place: string;
  dateLine: string;
  temperature: number;
  /** Secondary line under the condition, e.g. "Feels like 17° · H 21° L 12°" */
  subline: string;
  conditionLabel: string;
  unitSymbol: string;
  glyph: GlyphKind;
  style: HeroStyle;
  chart: HeroChartPoint[];
  /** Index into chart marking the current hour; pass -1 to hide the marker */
  nowIndex: number;
  /** Rendered width in points. Raycast crops (not scales) oversized images, so this must fit the target panel. */
  displayWidth?: number;
  /** Prefix for internal SVG ids; required to combine multiple renders in one document. */
  idPrefix?: string;
  /** Lunar phase 0..1 (0 new, 0.5 full). When set, the moon glyph is drawn phase-accurate. */
  moonPhase?: number;
}

/** Fits the side detail panel of a List at Raycast's default window size. */
const SIDE_PANEL_WIDTH = 310;

/** Deterministic pseudo-random generator so stars don't jump between renders. */
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stars(color: string): string {
  const rand = mulberry(7);
  let out = "";
  for (let i = 0; i < 46; i++) {
    const x = 20 + rand() * (W - 40);
    const y = 16 + rand() * 250;
    const r = 0.6 + rand() * 1.3;
    const o = 0.25 + rand() * 0.6;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${o.toFixed(2)}"/>`;
  }
  return out;
}

function cloud(cx: number, cy: number, scale: number, fill: string, opacity: number): string {
  return `<g transform="translate(${cx} ${cy}) scale(${scale})" fill="${fill}" opacity="${opacity}">
    <ellipse cx="0" cy="0" rx="52" ry="34"/>
    <ellipse cx="-46" cy="14" rx="36" ry="24"/>
    <ellipse cx="48" cy="12" rx="40" ry="26"/>
    <rect x="-70" y="8" width="140" height="30" rx="15"/>
  </g>`;
}

function sunCore(cx: number, cy: number, r: number, color: string): string {
  let rays = "";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(a) * (r + 14);
    const y1 = cy + Math.sin(a) * (r + 14);
    const x2 = cx + Math.cos(a) * (r + 34);
    const y2 = cy + Math.sin(a) * (r + 34);
    rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="9" stroke-linecap="round"/>`;
  }
  return `${rays}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
}

function drops(cx: number, cy: number, count: number, color: string, spread = 110): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = cx - spread / 2 + (spread / Math.max(count - 1, 1)) * i;
    const y = cy + (i % 2 === 0 ? 0 : 16);
    out += `<line x1="${x}" y1="${y}" x2="${x - 8}" y2="${y + 26}" stroke="${color}" stroke-width="7" stroke-linecap="round" opacity="0.9"/>`;
  }
  return out;
}

function flakes(cx: number, cy: number, color: string): string {
  let out = "";
  const positions = [
    [-48, 6],
    [-8, 26],
    [34, 4],
    [64, 30],
    [-70, 34],
  ];
  for (const [dx, dy] of positions) {
    const x = cx + dx;
    const y = cy + dy;
    out += `<g stroke="${color}" stroke-width="4" stroke-linecap="round" opacity="0.95">
      <line x1="${x - 8}" y1="${y}" x2="${x + 8}" y2="${y}"/>
      <line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y + 8}"/>
      <line x1="${x - 6}" y1="${y - 6}" x2="${x + 6}" y2="${y + 6}"/>
      <line x1="${x - 6}" y1="${y + 6}" x2="${x + 6}" y2="${y - 6}"/>
    </g>`;
  }
  return out;
}

/** Glyph centered at (655, 150); use a transform to place it elsewhere. `uid` keeps SVG ids unique when a document contains several glyphs. */
function glyph(kind: GlyphKind, style: HeroStyle, uid = "", ip = "", moonPhase?: number): string {
  const cx = 655;
  const cy = 150;
  const glow = `<circle cx="${cx}" cy="${cy}" r="120" fill="url(#${ip}glow)"/>`;

  switch (kind) {
    case "sun":
      return `${glow}${sunCore(cx, cy, 58, style.glow)}`;
    case "moon": {
      if (moonPhase === undefined) {
        // Stylized default crescent (used by mini glyphs and previews).
        return `${glow}
        <mask id="${ip}crescent${uid}"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><circle cx="${cx + 34}" cy="${cy - 26}" r="52" fill="#000"/></mask>
        <circle cx="${cx}" cy="${cy}" r="58" fill="${style.glow}" mask="url(#${ip}crescent${uid})"/>`;
      }
      // Phase-accurate: shadow disc slides away as illumination grows.
      // Waxing (phase < 0.5) lights the right limb, waning the left.
      const ill = (1 - Math.cos(2 * Math.PI * moonPhase)) / 2;
      if (ill > 0.97) return `${glow}<circle cx="${cx}" cy="${cy}" r="58" fill="${style.glow}"/>`;
      const dir = moonPhase < 0.5 ? -1 : 1;
      const offset = dir * ill * 116;
      const dark = `<circle cx="${cx + offset}" cy="${cy}" r="58" fill="#000"/>`;
      return `${glow}
        <circle cx="${cx}" cy="${cy}" r="58" fill="${style.glow}" opacity="0.22"/>
        <mask id="${ip}crescent${uid}"><rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>${dark}</mask>
        <circle cx="${cx}" cy="${cy}" r="58" fill="${style.glow}" mask="url(#${ip}crescent${uid})"/>`;
    }
    case "partly":
      return `${glow}${sunCore(cx - 34, cy - 34, 42, style.glow)}${cloud(cx + 16, cy + 30, 1.05, style.cloud, 0.98)}`;
    case "cloudy":
      return `${glow}${cloud(cx - 40, cy - 26, 0.8, style.cloudShade, 0.75)}${cloud(cx + 14, cy + 22, 1.1, style.cloud, 0.98)}`;
    case "fog":
      return `${glow}${cloud(cx, cy - 22, 0.95, style.cloudShade, 0.9)}
        <g stroke="${style.flake}" stroke-width="8" stroke-linecap="round" opacity="0.8">
          <line x1="${cx - 78}" y1="${cy + 38}" x2="${cx + 66}" y2="${cy + 38}"/>
          <line x1="${cx - 56}" y1="${cy + 62}" x2="${cx + 84}" y2="${cy + 62}"/>
          <line x1="${cx - 80}" y1="${cy + 86}" x2="${cx + 40}" y2="${cy + 86}"/>
        </g>`;
    case "drizzle":
      return `${glow}${cloud(cx, cy - 14, 1.0, style.cloud, 0.96)}${drops(cx, cy + 46, 4, style.accent)}`;
    case "rain":
      return `${glow}${cloud(cx, cy - 14, 1.05, style.cloud, 0.96)}${drops(cx, cy + 46, 6, style.accent)}`;
    case "snow":
      return `${glow}${cloud(cx, cy - 20, 1.05, style.cloud, 0.96)}${flakes(cx, cy + 44, style.flake)}`;
    case "storm":
      return `${glow}${cloud(cx, cy - 22, 1.1, style.cloudShade, 0.95)}
        <polygon points="${cx - 4},${cy + 10} ${cx - 34},${cy + 66} ${cx - 8},${cy + 66} ${cx - 22},${cy + 112} ${cx + 34},${cy + 48} ${cx + 6},${cy + 48} ${cx + 26},${cy + 10}" fill="${style.accent}"/>
        ${drops(cx - 62, cy + 40, 2, style.flake, 36)}${drops(cx + 66, cy + 40, 2, style.flake, 36)}`;
  }
}

/** Catmull-Rom spline through points, converted to cubic beziers. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function chart(opts: HeroOptions): string {
  // Open-Meteo can return null temperatures near the end of the forecast
  // horizon; cut the chart at the first hole so min/max lookups stay valid.
  const firstHole = opts.chart.findIndex((p) => !Number.isFinite(p.temp));
  const points = firstHole === -1 ? opts.chart : opts.chart.slice(0, firstHole);
  if (points.length < 2) return "";

  const left = 52;
  const right = W - 52;
  const top = 330;
  const bottom = 434;

  const temps = points.map((p) => p.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = Math.max(max - min, 2);

  const xy: [number, number][] = points.map((p, i) => [
    left + ((right - left) * i) / (points.length - 1),
    bottom - ((p.temp - min) / range) * (bottom - top),
  ]);

  const line = smoothPath(xy);
  const area = `${line} L ${right} ${bottom + 18} L ${left} ${bottom + 18} Z`;

  const text = opts.style.text;

  let labels = "";
  points.forEach((p, i) => {
    if (i % 6 !== 0 && i !== points.length - 1) return;
    labels += `<text x="${xy[i][0].toFixed(1)}" y="${bottom + 40}" font-family="${FONT}" font-size="17" fill="${text}" opacity="0.62" text-anchor="middle">${p.label}</text>`;
  });

  const maxIdx = temps.indexOf(max);
  const minIdx = temps.indexOf(min);
  const annotate = (i: number, value: number, above: boolean): string => {
    const [x, y] = xy[i];
    const ty = above ? y - 14 : y + 26;
    return `<text x="${x.toFixed(1)}" y="${ty.toFixed(1)}" font-family="${FONT}" font-size="17" font-weight="600" fill="${text}" opacity="0.85" text-anchor="middle">${Math.round(value)}°</text>`;
  };

  let nowDot = "";
  if (opts.nowIndex >= 0) {
    const [nx, ny] = xy[Math.min(opts.nowIndex, xy.length - 1)];
    nowDot = `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="9" fill="${opts.style.accent}" stroke="${text}" stroke-width="3"/>`;
  }

  return `
    <path d="${area}" fill="url(#${opts.idPrefix ?? ""}chartFill)"/>
    <path d="${line}" fill="none" stroke="${opts.style.accent}" stroke-width="4" stroke-linecap="round"/>
    ${annotate(maxIdx, max, true)}${minIdx !== maxIdx ? annotate(minIdx, min, false) : ""}
    ${nowDot}
    ${labels}`;
}

export function renderHero(opts: HeroOptions): string {
  const p = opts.style;
  const u = opts.unitSymbol;
  const ip = opts.idPrefix ?? "";
  const dw = opts.displayWidth ?? SIDE_PANEL_WIDTH;
  const dh = Math.round((dw * H) / W);
  const svg = `<svg width="${dw}" height="${dh}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${ip}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.sky[0]}"/>
      <stop offset="55%" stop-color="${p.sky[1]}"/>
      <stop offset="100%" stop-color="${p.sky[2]}"/>
    </linearGradient>
    <radialGradient id="${ip}glow">
      <stop offset="0%" stop-color="${p.glow}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${p.glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${ip}chartFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0.02"/>
    </linearGradient>
    <clipPath id="${ip}frame"><rect x="0" y="0" width="${W}" height="${H}" rx="26"/></clipPath>
  </defs>
  <g clip-path="url(#${ip}frame)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${ip}sky)"/>
    ${p.stars ? stars(p.text) : ""}
    ${glyph(opts.glyph, p, "", ip, opts.moonPhase)}

    <text x="52" y="78" font-family="${FONT}" font-size="30" font-weight="700" fill="${p.text}">${escapeXml(opts.place)}</text>
    <text x="52" y="108" font-family="${FONT}" font-size="19" fill="${p.text}" opacity="0.72">${escapeXml(opts.dateLine)}</text>

    <text x="46" y="228" font-family="${FONT}" font-size="118" font-weight="800" fill="${p.text}" letter-spacing="-3">${Number.isFinite(opts.temperature) ? Math.round(opts.temperature) : "—"}°<tspan font-size="56" font-weight="600" opacity="0.75">${u}</tspan></text>
    <text x="52" y="268" font-family="${FONT}" font-size="27" font-weight="600" fill="${p.accent}">${escapeXml(opts.conditionLabel)}</text>
    <text x="52" y="298" font-family="${FONT}" font-size="19" fill="${p.text}" opacity="0.78">${escapeXml(opts.subline)}</text>

    ${chart(opts)}
  </g>
</svg>`;
  return svg;
}

export interface StripHour {
  /** e.g. "Now" or "18h" */
  label: string;
  temp: number;
  glyph: GlyphKind;
  /** Precipitation in mm for the hour; decides whether the extra row is shown. */
  precip?: number;
  /** Display form of `precip` in the user's units, e.g. "1.2 mm" or "0.05 in". */
  precipText?: string;
}

const STRIP_H = 200;

/** A horizontal strip of upcoming hours: label, mini condition glyph, temperature. */
export function renderHourlyStrip(
  hours: StripHour[],
  style: HeroStyle,
  title: string,
  displayWidth = SIDE_PANEL_WIDTH,
  idPrefix = "s-",
): string {
  const ip = idPrefix;
  const pad = 36;
  const colW = (W - pad * 2) / hours.length;
  const scale = 0.3;

  const showPrecip = hours.some((h) => (h.precip ?? 0) >= 0.1);
  let columns = "";
  hours.forEach((h, i) => {
    const x = pad + colW * (i + 0.5);
    // Map the glyph's intrinsic center (655, 150) to (x, 108) at the mini scale.
    const gx = x - 655 * scale;
    const gy = (showPrecip ? 104 : 112) - 150 * scale;
    columns += `
    <text x="${x.toFixed(1)}" y="52" font-family="${FONT}" font-size="17" fill="${style.text}" opacity="${h.label === "Now" ? 0.95 : 0.6}" font-weight="${h.label === "Now" ? 700 : 400}" text-anchor="middle">${h.label}</text>
    <g transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${scale})">${glyph(h.glyph, style, `-${i}`, ip)}</g>
    <text x="${x.toFixed(1)}" y="${showPrecip ? 158 : 172}" font-family="${FONT}" font-size="21" font-weight="600" fill="${style.text}" text-anchor="middle">${Math.round(h.temp)}°</text>`;
    if (showPrecip && (h.precip ?? 0) >= 0.1) {
      columns += `
    <text x="${x.toFixed(1)}" y="184" font-family="${FONT}" font-size="15" font-weight="600" fill="${style.accent}" text-anchor="middle">${escapeXml(h.precipText ?? h.precip!.toFixed(1))}</text>`;
    }
  });

  const dh = Math.round((displayWidth * STRIP_H) / W);
  return `<svg width="${displayWidth}" height="${dh}" viewBox="0 0 ${W} ${STRIP_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${ip}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${style.sky[1]}"/>
      <stop offset="100%" stop-color="${style.sky[2]}"/>
    </linearGradient>
    <radialGradient id="${ip}glow">
      <stop offset="0%" stop-color="${style.glow}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${style.glow}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${ip}frame"><rect x="0" y="0" width="${W}" height="${STRIP_H}" rx="26"/></clipPath>
  </defs>
  <g clip-path="url(#${ip}frame)">
    <rect x="0" y="0" width="${W}" height="${STRIP_H}" fill="url(#${ip}sky)"/>
    <text x="${pad + 6}" y="24" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="2" fill="${style.text}" opacity="0.55">${escapeXml(title.toUpperCase())}</text>
    ${columns}
  </g>
</svg>`;
}

export interface NowcastStep {
  /** e.g. "20:15" */
  label: string;
  /** Precipitation in mm for the 15-minute step. */
  mm: number;
}

const NOWCAST_H = 170;

/** Bar chart of 15-minute precipitation for the next ~3 hours. */
export function renderNowcast(
  steps: NowcastStep[],
  style: HeroStyle,
  title: string,
  displayWidth = SIDE_PANEL_WIDTH,
  idPrefix = "nc-",
): string {
  const pad = 42;
  const top = 48;
  const bottom = 126;
  const colW = (W - pad * 2) / steps.length;
  const max = Math.max(...steps.map((s) => s.mm), 0.6);

  let bars = "";
  let labels = "";
  steps.forEach((s, i) => {
    const x = pad + colW * i + colW * 0.14;
    const bw = colW * 0.72;
    const h = Math.max((s.mm / max) * (bottom - top), s.mm > 0 ? 5 : 2.5);
    const y = bottom - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${style.accent}" opacity="${s.mm > 0 ? 0.92 : 0.28}"/>`;
    if (i % 4 === 0) {
      labels += `<text x="${(pad + colW * i + colW / 2).toFixed(1)}" y="${bottom + 26}" font-family="${FONT}" font-size="16" fill="${style.text}" opacity="0.62" text-anchor="middle">${escapeXml(s.label)}</text>`;
    }
  });

  const dh = Math.round((displayWidth * NOWCAST_H) / W);
  return `<svg width="${displayWidth}" height="${dh}" viewBox="0 0 ${W} ${NOWCAST_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${idPrefix}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${style.sky[1]}"/>
      <stop offset="100%" stop-color="${style.sky[2]}"/>
    </linearGradient>
    <clipPath id="${idPrefix}frame"><rect x="0" y="0" width="${W}" height="${NOWCAST_H}" rx="26"/></clipPath>
  </defs>
  <g clip-path="url(#${idPrefix}frame)">
    <rect x="0" y="0" width="${W}" height="${NOWCAST_H}" fill="url(#${idPrefix}sky)"/>
    <text x="${pad + 6}" y="28" font-family="${FONT}" font-size="13" font-weight="700" letter-spacing="2" fill="${style.text}" opacity="0.55">${escapeXml(title.toUpperCase())}</text>
    <line x1="${pad}" y1="${bottom}" x2="${W - pad}" y2="${bottom}" stroke="${style.text}" stroke-width="1.5" opacity="0.25"/>
    ${bars}
    ${labels}
  </g>
</svg>`;
}

export interface RadarCardOptions {
  baseTiles: FetchedTile[];
  radarTiles: FetchedTile[];
  /** Rendered size of one radar tile in base-grid pixels (radar comes from a coarser zoom). */
  radarTilePx: number;
  /** Where radar tile (0,0) lands in base-grid pixel space. */
  radarOriginX: number;
  radarOriginY: number;
  /** Pixel position of the frame centre inside the tile grid image. */
  px: number;
  py: number;
  /** Pixel position of the location marker inside the grid image; hidden when it falls outside the frame. */
  markerX?: number;
  markerY?: number;
  place: string;
  /** e.g. "Radar · 20:10" */
  timeLabel: string;
  /** Approximate frame width, e.g. "≈ 360 km across" */
  scaleLabel: string;
  style: HeroStyle;
  displayWidth?: number;
  idPrefix?: string;
}

const RADAR_H = 620;

/** The location dot, drawn where the city sits in the (possibly panned) frame. */
function marker(opts: RadarCardOptions): string {
  const gx = opts.markerX ?? opts.px;
  const gy = opts.markerY ?? opts.py;
  const fx = W / 2 + (gx - opts.px);
  const fy = RADAR_H / 2 + (gy - opts.py);
  if (fx < 14 || fx > W - 14 || fy < 14 || fy > RADAR_H - 14) return "";
  return `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="20" fill="${opts.style.accent}" opacity="0.35"/>
    <circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="9" fill="${opts.style.accent}" stroke="#ffffff" stroke-width="3.5"/>`;
}

/** Instant placeholder shown while radar tiles download: themed frame with a radar sweep motif. */
export function renderRadarLoadingCard(place: string, style: HeroStyle, displayWidth = SIDE_PANEL_WIDTH): string {
  const dw = displayWidth;
  const dh = Math.round((dw * RADAR_H) / W);
  const cx = W / 2;
  const cy = RADAR_H / 2 + 10;
  const rings = [56, 104, 152]
    .map(
      (r, i) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${style.accent}" stroke-width="3" opacity="${0.5 - i * 0.14}"/>`,
    )
    .join("");
  return `<svg width="${dw}" height="${dh}" viewBox="0 0 ${W} ${RADAR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="rl-frame"><rect x="0" y="0" width="${W}" height="${RADAR_H}" rx="26"/></clipPath>
    <linearGradient id="rl-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${style.sky[1]}"/>
      <stop offset="100%" stop-color="${style.sky[2]}"/>
    </linearGradient>
    <linearGradient id="rl-sweep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${style.accent}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${style.accent}" stop-opacity="0.5"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#rl-frame)">
    <rect x="0" y="0" width="${W}" height="${RADAR_H}" fill="url(#rl-sky)"/>
    ${rings}
    <path d="M ${cx} ${cy} L ${cx + 152} ${cy - 62} A 164 164 0 0 1 ${cx + 164} ${cy} Z" fill="url(#rl-sweep)"/>
    <circle cx="${cx}" cy="${cy}" r="8" fill="${style.accent}"/>
    <text x="42" y="52" font-family="${FONT}" font-size="28" font-weight="700" fill="${style.text}">${escapeXml(place)}</text>
    <text x="42" y="82" font-family="${FONT}" font-size="18" fill="${style.text}" opacity="0.85">Radar</text>
    <text x="${cx}" y="${cy + 214}" font-family="${FONT}" font-size="20" fill="${style.text}" opacity="0.8" text-anchor="middle">Fetching radar tiles…</text>
  </g>
</svg>`;
}

/**
 * Themed placeholder shown while the forecast is being fetched: sky gradient,
 * place name, a pulsing sun and a status line. Same footprint as the hero so
 * the layout doesn't jump when the real card arrives.
 */
export function renderLoadingCard(
  place: string,
  message: string,
  style: HeroStyle,
  displayWidth = SIDE_PANEL_WIDTH,
): string {
  const dw = displayWidth;
  const dh = Math.round((dw * H) / W);
  const cx = W / 2;
  const cy = H / 2 + 6;
  const rings = [40, 78, 116]
    .map(
      (
        r,
        i,
      ) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${style.accent}" stroke-width="3" opacity="0">
      <animate attributeName="opacity" values="0;${0.45 - i * 0.12};0" dur="2.4s" begin="${i * 0.4}s" repeatCount="indefinite"/>
    </circle>`,
    )
    .join("");
  return `<svg width="${dw}" height="${dh}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="ld-frame"><rect x="0" y="0" width="${W}" height="${H}" rx="26"/></clipPath>
    <linearGradient id="ld-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${style.sky[0]}"/>
      <stop offset="60%" stop-color="${style.sky[1]}"/>
      <stop offset="100%" stop-color="${style.sky[2]}"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#ld-frame)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ld-sky)"/>
    ${rings}
    <circle cx="${cx}" cy="${cy}" r="22" fill="${style.accent}">
      <animate attributeName="r" values="20;24;20" dur="2.4s" repeatCount="indefinite"/>
    </circle>
    <text x="52" y="78" font-family="${FONT}" font-size="30" font-weight="700" fill="${style.text}">${escapeXml(place)}</text>
    <text x="${cx}" y="${cy + 170}" font-family="${FONT}" font-size="22" fill="${style.text}" opacity="0.8" text-anchor="middle">${escapeXml(message)}</text>
  </g>
</svg>`;
}

/** Basemap + radar overlay tiles composed into a framed card with a location marker. */
export function renderRadarCard(opts: RadarCardOptions): string {
  const ip = opts.idPrefix ?? "rd-";
  const dw = opts.displayWidth ?? SIDE_PANEL_WIDTH;
  const dh = Math.round((dw * RADAR_H) / W);
  const ox = W / 2 - opts.px;
  const oy = RADAR_H / 2 - opts.py;

  // Missing basemap tiles get a filler so the map has no holes; missing radar tiles must stay transparent.
  const layer = (tiles: FetchedTile[], filler: boolean, tilePx: number, originX = 0, originY = 0): string =>
    tiles
      .map((t) => {
        const x = originX + t.col * tilePx;
        const y = originY + t.row * tilePx;
        if (!t.href) {
          return filler ? `<rect x="${x}" y="${y}" width="${tilePx}" height="${tilePx}" fill="#242830"/>` : "";
        }
        return `<image x="${x}" y="${y}" width="${tilePx}" height="${tilePx}" href="${t.href}"/>`;
      })
      .join("");

  const legendStops = ["#7fdb62", "#f5d94e", "#f0913c", "#e5534b", "#a13ca8"];

  return `<svg width="${dw}" height="${dh}" viewBox="0 0 ${W} ${RADAR_H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="${ip}frame"><rect x="0" y="0" width="${W}" height="${RADAR_H}" rx="26"/></clipPath>
    <linearGradient id="${ip}scrimTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${ip}scrimBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="${ip}legend" x1="0" y1="0" x2="1" y2="0">
      ${legendStops.map((c, i) => `<stop offset="${(i / (legendStops.length - 1)) * 100}%" stop-color="${c}"/>`).join("")}
    </linearGradient>
  </defs>
  <g clip-path="url(#${ip}frame)">
    <rect x="0" y="0" width="${W}" height="${RADAR_H}" fill="#242830"/>
    <g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)})">
      ${layer(opts.baseTiles, true, TILE_PX)}
      ${layer(opts.radarTiles, false, opts.radarTilePx, opts.radarOriginX, opts.radarOriginY)}
    </g>
    <rect x="0" y="0" width="${W}" height="120" fill="url(#${ip}scrimTop)"/>
    <rect x="0" y="${RADAR_H - 96}" width="${W}" height="96" fill="url(#${ip}scrimBottom)"/>

    ${marker(opts)}

    <text x="42" y="52" font-family="${FONT}" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(opts.place)}</text>
    <text x="42" y="82" font-family="${FONT}" font-size="18" fill="#ffffff" opacity="0.85">${escapeXml(opts.timeLabel)}</text>

    <rect x="42" y="${RADAR_H - 46}" width="150" height="10" rx="5" fill="url(#${ip}legend)"/>
    <text x="42" y="${RADAR_H - 56}" font-family="${FONT}" font-size="14" fill="#ffffff" opacity="0.85">Light</text>
    <text x="150" y="${RADAR_H - 56}" font-family="${FONT}" font-size="14" fill="#ffffff" opacity="0.85">Heavy</text>
    <text x="42" y="${RADAR_H - 18}" font-family="${FONT}" font-size="14" fill="#ffffff" opacity="0.7">${escapeXml(opts.scaleLabel)}</text>
    <text x="565" y="${RADAR_H - 18}" font-family="${FONT}" font-size="13" fill="#ffffff" opacity="0.6">Esri · OpenStreetMap · RainViewer</text>
  </g>
</svg>`;
}

export interface Stat {
  label: string;
  value: string;
}

const STATS_H = 118;

/** A bar of labelled stats (humidity, wind, UV…), matching the card style. */
export function renderStatsBar(
  stats: Stat[],
  style: HeroStyle,
  displayWidth = SIDE_PANEL_WIDTH,
  idPrefix = "st-",
): string {
  const colW = W / stats.length;
  let columns = "";
  stats.forEach((s, i) => {
    const x = colW * (i + 0.5);
    columns += `
    <text x="${x.toFixed(1)}" y="48" font-family="${FONT}" font-size="14" font-weight="700" letter-spacing="1.5" fill="${style.text}" opacity="0.55" text-anchor="middle">${escapeXml(s.label.toUpperCase())}</text>
    <text x="${x.toFixed(1)}" y="82" font-family="${FONT}" font-size="22" font-weight="600" fill="${style.text}" text-anchor="middle">${escapeXml(s.value)}</text>`;
  });
  const dh = Math.round((displayWidth * STATS_H) / W);
  return `<svg width="${displayWidth}" height="${dh}" viewBox="0 0 ${W} ${STATS_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${idPrefix}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${style.sky[1]}"/>
      <stop offset="100%" stop-color="${style.sky[2]}"/>
    </linearGradient>
    <clipPath id="${idPrefix}frame"><rect x="0" y="0" width="${W}" height="${STATS_H}" rx="26"/></clipPath>
  </defs>
  <g clip-path="url(#${idPrefix}frame)">
    <rect x="0" y="0" width="${W}" height="${STATS_H}" fill="url(#${idPrefix}sky)"/>
    ${columns}
  </g>
</svg>`;
}

/** Radar frame + stats bar stacked into the same square 840×840 share format. */
export function composeRadarShareCard(radarSvg: string, statsSvg: string): string {
  const gap = Math.round((W - RADAR_H - STATS_H) / 2);
  return `<svg width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg">
  ${radarSvg}
  <g transform="translate(0 ${RADAR_H + gap})">${statsSvg}</g>
</svg>`;
}

/**
 * Stack full-size (840pt) hero, strip, and stats bar into one shareable SVG.
 * The result is exactly square (840×840): macOS's QuickLook rasterizer crops
 * non-square SVGs, and square cards read well in chat apps anyway.
 */
export function composeShareCard(heroSvg: string, stripSvg: string, statsSvg: string): string {
  const gap = 16;
  // H + gap + STRIP_H + gap + STATS_H = 490 + 16 + 200 + 16 + 118 = 840 = W
  return `<svg width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg">
  ${heroSvg}
  <g transform="translate(0 ${H + gap})">${stripSvg}</g>
  <g transform="translate(0 ${H + gap + STRIP_H + gap})">${statsSvg}</g>
</svg>`;
}

export function svgToMarkdown(svg: string, alt = "Weather"): string {
  // encodeURIComponent leaves parentheses raw, which can confuse markdown URL parsing.
  const encoded = encodeURIComponent(svg).replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `![${markdownAlt(alt)}](data:image/svg+xml,${encoded})`;
}
