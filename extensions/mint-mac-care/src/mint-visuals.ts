// Pure SVG drawings for Raycast's markdown, in Inkdot, Mint's house style:
// light ink on the theme's ground, fine dots as the only ornament, thin large
// numerals, small monospaced captions, a colour only ever on a dot. Nothing is
// imported, so the tests and a browser render exactly what Raycast shows;
// sizes are written by the formatter the caller passes.

export type ByteFormatter = (bytes: number) => string;

export type Appearance = "light" | "dark";

/** The Disk page's four groups, in the app's own fixed colours. */
export const GROUPS = [
  { key: "optimizable", title: "Optimizable", color: "#3DDC84" },
  { key: "safeToClean", title: "Safe to clean", color: "#62A3FF" },
  { key: "yours", title: "Yours", color: "#F5BD45" },
  { key: "keep", title: "Keep", color: "#8E8E93" },
] as const;

export type GroupKey = (typeof GROUPS)[number]["key"];
export type GroupBytes = Record<GroupKey, number>;

/**
 * Ink on Raycast's ground (MintInk, language.md §1): dark is white ink, light
 * is the "paper" variant in black ink. One warn colour, only for a limit; the
 * accent is Mint itself, at full strength or not at all.
 */
type Palette = {
  primary: string;
  secondary: string;
  tertiary: string;
  faint: string;
  /** A dot that is not lit (`MintInk.Alpha.unlit`). */
  unlit: string;
  /** Keep's dot: ink at 0.48 (language.md §2). */
  keep: string;
  /** A halftone column under its top dot (IslandHalftoneTrend's 0.26). */
  column: string;
  surface: string;
  hairline: string;
  accent: string;
  warn: string;
};

export function palette(appearance: Appearance): Palette {
  const ink = (alpha: number) => (appearance === "light" ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`);
  return appearance === "light"
    ? {
        primary: ink(0.9),
        secondary: ink(0.6),
        tertiary: ink(0.46),
        faint: ink(0.2),
        unlit: ink(0.12),
        keep: ink(0.48),
        column: ink(0.24),
        surface: ink(0.035),
        hairline: ink(0.1),
        accent: "#336E00",
        warn: "#B86A10",
      }
    : {
        primary: ink(0.94),
        secondary: ink(0.62),
        tertiary: ink(0.42),
        faint: ink(0.22),
        unlit: ink(0.14),
        keep: ink(0.48),
        column: ink(0.26),
        surface: ink(0.045),
        hairline: ink(0.08),
        accent: "#BDFE3A",
        warn: "#FFB561",
      };
}

/** Mint's accent, bright on dark and deep on light (the website's pair). */
export function accent(appearance: Appearance): string {
  return palette(appearance).accent;
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

export function escapeXML(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A markdown image Raycast draws at the given size. The alt text can be a folder or app name, so it is escaped. */
export function markdownImage(svg: string, width: number, height: number, alt = ""): string {
  const data = Buffer.from(svg, "utf8").toString("base64");
  const label = alt.replace(/[\\[\]]/g, "\\$&").replace(/[\r\n]+/g, " ");
  return `![${label}](data:image/svg+xml;base64,${data}?raycast-width=${width}&raycast-height=${height})`;
}

function svgOpen(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">`;
}

// Advance widths of SF Pro Text (regular, tabular digits) in em, for ASCII 32…126,
// measured with AppKit at 13 pt. Raycast draws these SVGs with -apple-system,
// so a label is cut by the room it really takes, never by its character count:
// "Codex runtime cache (~/.cache/cod…" is 34 characters and 233 pt at 13.5,
// wider than the column it was given (2026-09-30 screenshot).
const ASCII_EM = [
  0.275, 0.305, 0.472, 0.624, 0.624, 0.919, 0.706, 0.291, 0.376, 0.376, 0.466, 0.624, 0.291, 0.466, 0.291, 0.299, 0.624,
  0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.624, 0.291, 0.291, 0.624, 0.624, 0.624, 0.507, 0.912, 0.668,
  0.651, 0.71, 0.721, 0.59, 0.566, 0.741, 0.736, 0.262, 0.532, 0.653, 0.562, 0.868, 0.736, 0.766, 0.629, 0.766, 0.647,
  0.631, 0.628, 0.731, 0.668, 0.962, 0.673, 0.649, 0.656, 0.376, 0.299, 0.376, 0.624, 0.578, 0.494, 0.546, 0.608, 0.554,
  0.608, 0.565, 0.356, 0.604, 0.583, 0.241, 0.241, 0.537, 0.247, 0.864, 0.578, 0.585, 0.604, 0.604, 0.375, 0.518, 0.357,
  0.578, 0.536, 0.769, 0.519, 0.537, 0.533, 0.376, 0.253, 0.376, 0.624,
];
const OTHER_EM: Record<string, number> = {
  "—": 0.868,
  "–": 0.624,
  "…": 0.799,
  "·": 0.291,
  "’": 0.291,
  "→": 0.9,
  "−": 0.624,
};

/** How wide `value` is drawn at `size` pt; a little generous, so a cut label never touches its neighbour. */
export function textWidth(value: string, size: number, weight = 400): number {
  let em = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 32 && code <= 126) em += ASCII_EM[code - 32];
    else if (OTHER_EM[char] !== undefined) em += OTHER_EM[char];
    else if (code >= 0x2e80) em += 1;
    else em += 0.65;
  }
  const heavier = weight >= 600 ? 1.07 : weight > 400 ? 1.035 : 1;
  return em * size * heavier * 1.03;
}

/** `value` cut to fit `room` pt at `size`, ending in "…" when it was cut. */
export function fitText(value: string, room: number, size: number, weight = 400): string {
  if (textWidth(value, size, weight) <= room) return value;
  const chars = [...value];
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (textWidth(`${chars.slice(0, mid).join("").trimEnd()}…`, size, weight) <= room) low = mid;
    else high = mid - 1;
  }
  const kept = chars
    .slice(0, Math.max(1, low))
    .join("")
    .replace(/[\s—–·,(/-]+$/u, "");
  return `${kept || chars[0]}…`;
}

/** How wide `value` is in the monospaced caption face: every glyph 0.61 em. */
export function monoWidth(value: string, size: number): number {
  return [...value].length * 0.61 * size;
}

type TextOptions = { weight?: number; anchor?: "start" | "middle" | "end"; mono?: boolean };

function text(x: number, y: number, value: string, fill: string, size: number, options: TextOptions = {}) {
  const weight = options.weight ? ` font-weight="${options.weight}"` : "";
  const anchor = options.anchor && options.anchor !== "start" ? ` text-anchor="${options.anchor}"` : "";
  const family = options.mono ? ` font-family="${MONO}"` : "";
  return `<text x="${round(x)}" y="${round(y)}" fill="${fill}" font-size="${size}"${weight}${anchor}${family} style="font-variant-numeric: tabular-nums">${escapeXML(value)}</text>`;
}

/** A monospaced caption, 10.5 pt, the way Inkdot writes metadata. */
function caption(x: number, y: number, value: string, fill: string, anchor: TextOptions["anchor"] = "start") {
  return text(x, y, value, fill, 10.5, { mono: true, anchor });
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * The number that matters, large and light, its unit small beside it:
 * "10.9 GB" is 10.9 at `size` and "GB" at 13 pt in tertiary ink. Words with
 * no leading number ("None", "Tidy") and a percentage ("42%", as Mint writes
 * one) are set whole at the same weight.
 */
function hero(x: number, y: number, value: string, p: Palette, size = 30): string {
  const match = /^\d+%$/.test(value) ? null : value.match(/^([~+−-]?[\d.,]+)\s*(.*)$/u);
  if (!match) return text(x, y, value, p.primary, size, { weight: 300 });
  const [, number, unit] = match;
  const unitX = x + textWidth(number, size, 300) * 0.93 + 5;
  return `${text(x, y, number, p.primary, size, { weight: 300 })}${unit ? text(unitX, y, unit, p.tertiary, 13) : ""}`;
}

// ---------------------------------------------------------------------------
// Dots: the meter, the orb and the halftone trend. Inkdot's three pictures.
// ---------------------------------------------------------------------------

/** MintDotMeter's geometry: 3.4 pt dots, 2.4 pt apart. */
export const DOT = 3.4;
const DOT_GAP = 2.4;
const DOT_STEP = DOT + DOT_GAP;
/** A bucket's lit dot is its colour at 0.85 (MintDotMeter.litOpacity). */
const LIT_OPACITY = 0.85;

/** As many dots as fit in `width`. */
export function dotsThatFit(width: number): number {
  return width >= DOT ? Math.floor((width + DOT_GAP) / DOT_STEP) : 0;
}

/**
 * Dots per part, in proportion (largest remainder), together exactly
 * `total`; a part with any bytes keeps at least `minimum` (MintOrbColors.counts
 * with MintDotMeter.allocate's floor).
 */
export function allocateDots(weights: number[], total: number, minimum = 0): number[] {
  const clean = weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (!(total > 0) || !(sum > 0)) return clean.map(() => 0);
  const floors = clean.map((weight) => (weight > 0 ? minimum : 0));
  const rest = total - floors.reduce((a, b) => a + b, 0);
  if (rest < 0) return clean.map((weight, index) => (weight > 0 && index < total ? 1 : 0));
  const exact = clean.map((weight) => (weight / sum) * rest);
  const counts = exact.map((value) => Math.floor(value));
  const order = exact
    .map((value, index) => ({ index, remainder: value - counts[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order.slice(0, rest - counts.reduce((a, b) => a + b, 0))) counts[index] += 1;
  return counts.map((count, index) => count + floors[index]);
}

/**
 * A resource card's bar, split as its legend is: dots per legend row (the
 * groups scaled into what is used, so free space stays the free space Mint
 * states), then the free dots, together exactly `count`. A row with any bytes
 * keeps at least one dot. With no group above zero nothing is lit.
 */
export function cardMeterDots(
  legend: LegendRow[],
  usedBytes: number,
  totalBytes: number,
  count: number,
): { counts: number[]; free: number } {
  const rows = legend.filter((row) => !row.free);
  const weights = rows.map((row) => (Number.isFinite(row.bytes) && (row.bytes ?? 0) > 0 ? (row.bytes as number) : 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!(count > 0)) return { counts: rows.map(() => 0), free: 0 };
  if (!(sum > 0)) return { counts: rows.map(() => 0), free: count };
  const total = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : sum;
  const used = Number.isFinite(usedBytes) && usedBytes > 0 ? Math.min(usedBytes, total) : Math.min(sum, total);
  const scaled = weights.map((weight) => (weight / sum) * used);
  const weightsWithFree = [...scaled, Math.max(0, total - used)];
  // In proportion first, then a part with bytes and no dot takes one from the
  // largest part, so a floor never skews the shares of the rest.
  const all = allocateDots(weightsWithFree, count);
  weightsWithFree.forEach((weight, index) => {
    if (weight <= 0 || all[index] > 0) return;
    const largest = all.indexOf(Math.max(...all));
    if (all[largest] > 1) {
      all[largest] -= 1;
      all[index] = 1;
    }
  });
  return { counts: all.slice(0, rows.length), free: all[rows.length] };
}

/** A row of dots from (x, y), the y their centre; `colors[i]` null is an unlit dot. */
function dotRow(x: number, y: number, colors: Array<{ fill: string; opacity?: number } | null>, p: Palette): string {
  return colors
    .map((dot, index) => {
      const cx = x + DOT / 2 + index * DOT_STEP;
      const fill = dot ? dot.fill : p.unlit;
      const opacity = dot?.opacity !== undefined && dot.opacity < 1 ? ` fill-opacity="${dot.opacity}"` : "";
      return `<circle cx="${round(cx)}" cy="${round(y)}" r="${DOT / 2}" fill="${fill}"${opacity}/>`;
    })
    .join("");
}

export type MeterPart = { bytes: number; color: string };

/**
 * One continuous row of dots, each part lit in its colour at its share of
 * `total` (or of the parts when no total), the rest unlit. Returns the SVG
 * and where each part's first dot sits, for its caption.
 */
function dotMeter(x: number, y: number, width: number, parts: MeterPart[], p: Palette, total?: number) {
  const count = dotsThatFit(width);
  const sum = parts.reduce((s, part) => s + Math.max(0, part.bytes), 0);
  const whole = total !== undefined && total > sum ? total : sum;
  const weights = [...parts.map((part) => part.bytes), Math.max(0, whole - sum)];
  const counts = allocateDots(weights, count, 1);
  const colors: Array<{ fill: string; opacity?: number } | null> = [];
  const starts: number[] = [];
  parts.forEach((part, index) => {
    starts.push(colors.length);
    for (let i = 0; i < counts[index]; i += 1) colors.push({ fill: part.color, opacity: dotOpacity(part.color, p) });
  });
  while (colors.length < count) colors.push(null);
  return { svg: dotRow(x, y, colors, p), starts: starts.map((start) => x + start * DOT_STEP), count };
}

/** Ink and the accent are drawn as they are; a bucket colour is a dot at 0.85. */
function dotOpacity(color: string, p: Palette): number | undefined {
  return color.startsWith("#") && color !== p.accent && color !== p.warn ? LIT_OPACITY : undefined;
}

/**
 * Mint's planet as a still frame (MintOrbView.project): a Fibonacci sphere
 * tilted 22°, depth drawn as size, never a fainter colour; the back half
 * hidden. `turn` is the sphere's angle: a caller that is working turns it.
 */
export function orbSVG(cx: number, cy: number, diameter: number, count: number, color: string, turn = 0.6): string {
  const tilt = (22 * Math.PI) / 180;
  const dot = diameter <= 12 ? 1.4 : diameter <= 16 ? 1.6 : diameter <= 22 ? 1.8 : 2.2;
  const radius = diameter / 2 - dot * 0.7;
  const dots: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const yUnit = 1 - (2 * (index + 0.5)) / count;
    const ring = Math.sqrt(Math.max(0, 1 - yUnit * yUnit)) * radius;
    const u = index * Math.PI * (3 - Math.sqrt(5)) + turn;
    const x = ring * Math.sin(u);
    const z = ring * Math.cos(u);
    const screenY = radius * yUnit * Math.cos(tilt) - z * Math.sin(tilt);
    const depth = ((radius * yUnit * Math.sin(tilt) + z * Math.cos(tilt)) / radius + 1) / 2;
    const scale = depth <= 0.5 ? 0 : Math.pow((depth - 0.5) * 2, 0.45);
    if (scale < 0.05) continue;
    dots.push(
      `<circle cx="${round(cx + x)}" cy="${round(cy - screenY)}" r="${round((dot / 2) * scale * 100) / 100}" fill="${color}"/>`,
    );
  }
  return dots.join("");
}

/**
 * The island's halftone trend (IslandHalftoneTrend): one column of dots per
 * moment, lit up to the value, its top dot bright and the column under it dim.
 * `values[i]` null is a moment Mint did not record: an empty column.
 */
function halftone(
  x: number,
  y: number,
  width: number,
  height: number,
  values: Array<number | null>,
  rows: number,
  p: Palette,
  topColor: (column: number) => string,
  floor = 0,
  line = false,
): string {
  const columns = values.length;
  if (!columns) return "";
  const known = values.filter((value): value is number => value !== null);
  const top = Math.max(...known, floor + 0.1);
  const gapX = width / columns;
  const gapY = height / rows;
  const dot = Math.min(gapX, gapY) * 0.58;
  const out: string[] = [];
  values.forEach((value, column) => {
    if (value === null) return;
    const lit = Math.min(rows, Math.max(1, Math.ceil(((value - floor) / Math.max(1e-9, top - floor)) * rows)));
    for (let row = 0; row < rows; row += 1) {
      const cx = x + column * gapX + gapX / 2;
      const cy = y + height - (row * gapY + gapY / 2);
      // The island's three inks: the top dot bright, the column dim, the rest barely there.
      // A line (Disk Growth's long history) lights only its top dot; every
      // other dot is Inkdot's unlit grid, so the line reads at a glance.
      const fill = row === lit - 1 ? topColor(column) : row < lit && !line ? p.column : p.unlit;
      const opacity = row === lit - 1 || line || row < lit ? "" : ' fill-opacity="0.4"';
      out.push(`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(dot / 2)}" fill="${fill}"${opacity}/>`);
    }
  });
  return out.join("");
}

/** A value per column over `points`' span: the first recorded point at or after each moment (IslandHalftoneTrend.values). */
export function columnValues(
  points: Array<{ at: number; value: number | null }>,
  columns: number,
): Array<number | null> {
  if (points.length < 2) return points.length ? [points[0].value] : [];
  const first = points[0].at;
  const last = points[points.length - 1].at;
  if (!(last > first)) return [points[points.length - 1].value];
  return Array.from({ length: columns }, (_, column) => {
    const t = first + ((last - first) * column) / (columns - 1);
    const found = points.find((point) => point.at >= t - 1e-6);
    return found ? found.value : points[points.length - 1].value;
  });
}

// ---------------------------------------------------------------------------
// View Mac Status: the island's Get back card on top, then Disk and Memory,
// then the organized folders. One surface per group, hairlines between rows.
// ---------------------------------------------------------------------------

type IconName = "disk" | "memory" | "folder";

/** Small line glyphs, 16 × 16, in the spirit of the app's SF Symbols. */
function icon(name: IconName, x: number, y: number, color: string): string {
  const paths: Record<IconName, string> = {
    disk: `<rect x="1.5" y="4.5" width="13" height="8" rx="2"/><path d="M1.9 9.2h12.2"/>`,
    memory: `<rect x="2.5" y="4" width="11" height="8" rx="1.4"/><path d="M5.5 2v2M8 2v2M10.5 2v2M5.5 12v2M8 12v2M10.5 12v2"/>`,
    folder: `<path d="M2 4.6a1.1 1.1 0 0 1 1.1-1.1h2.8l1.4 1.6h5.6a1.1 1.1 0 0 1 1.1 1.1v6a1.1 1.1 0 0 1-1.1 1.1H3.1A1.1 1.1 0 0 1 2 12.2z"/>`,
  };
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`;
}

function surface(x: number, y: number, width: number, height: number, p: Palette): string {
  return `<rect x="${x + 0.3}" y="${y + 0.3}" width="${width - 0.6}" height="${height - 0.6}" rx="18" fill="${p.surface}" stroke="${p.hairline}" stroke-width="0.6"/>`;
}

function hairline(x1: number, y1: number, x2: number, y2: number, p: Palette): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${p.hairline}" stroke-width="0.6"/>`;
}

/** A legend row's dot; `free` is the empty part of a meter, drawn as an unlit dot. */
export type LegendRow = { title: string; color: string; bytes?: number; free?: boolean };

export type ResourceCard = {
  icon: "disk" | "memory";
  title: string;
  /** "391.1 GB / 494.4 GB" */
  usage: string;
  /** The card's number: a value, then what it is ("free", "idle"). */
  center: { value: string; label: string };
  legend: LegendRow[];
  totalBytes: number;
  usedBytes: number;
  care: string;
};

export type FolderCard = { name: string; status: string; care: string };

/** The island's Get back card (mint-nudge.ts builds it from Mint's files). */
export type GlanceNudge = {
  getBackBytes: number;
  optimizableBytes: number;
  safeToCleanBytes: number;
  series: Array<{ at: number; gb: number }>;
  rise?: string;
  level?: string;
};

export type GlanceInput = {
  appearance: Appearance;
  format: ByteFormatter;
  nudge?: GlanceNudge;
  disk?: ResourceCard;
  memory?: ResourceCard;
  folders?: FolderCard[];
  moreFolders?: number;
};

export const GLANCE_WIDTH = 680;
const CARD_GAP = 12;
const CARD_WIDTH = (GLANCE_WIDTH - CARD_GAP) / 2;
const NUDGE_HEIGHT = 124;
const RESOURCE_HEIGHT = 152;
const FOLDER_HEIGHT = 56;

/** "29.7 GB", "120 GB": the island always speaks GB (IslandFormat.gbUnit). */
function islandGB(bytes: number): string {
  const value = Math.max(0, bytes) / 1e9;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} GB`;
}

/**
 * The island's Get back card, pulled: the number, "Can come back", the trend
 * once it rose with the dropdown's "+X in 30 days", the meter of what the
 * button removes in its buckets' colours, and the person's Notify me level.
 */
function nudgeCard(nudge: GlanceNudge, y: number, p: Palette): string {
  const w = GLANCE_WIDTH;
  const pad = 18;
  const parts: string[] = [surface(0, y, w, NUDGE_HEIGHT, p)];
  parts.push(orbSVG(pad + 7, y + 22, 14, 24, p.accent));
  parts.push(text(pad + 22, y + 26, "Get back", p.secondary, 13, { weight: 500 }));
  if (nudge.level) parts.push(caption(w - pad, y + 26, nudge.level, p.tertiary, "end"));
  parts.push(hero(pad, y + 64, islandGB(nudge.getBackBytes), p, 32));
  parts.push(text(pad, y + 84, "Can come back", p.secondary, 13));
  if (nudge.series.length >= 2) {
    const trendWidth = 176;
    const trendX = w - pad - trendWidth;
    const values = columnValues(
      nudge.series.map((point) => ({ at: point.at, value: point.gb })),
      34,
    );
    parts.push(halftone(trendX, y + 34, trendWidth, 40, values, 7, p, () => p.primary));
    if (nudge.rise) parts.push(caption(w - pad, y + 86, nudge.rise, p.tertiary, "end"));
  }
  const buckets = [
    { title: "Optimizable", bytes: nudge.optimizableBytes, color: GROUPS[0].color },
    { title: "Safe to clean", bytes: nudge.safeToCleanBytes, color: GROUPS[1].color },
  ].filter((bucket) => bucket.bytes > 0);
  const meter = dotMeter(pad, y + 100, w - 2 * pad, buckets, p);
  parts.push(meter.svg);
  let nextFree = pad;
  buckets.forEach((bucket, index) => {
    const at = Math.max(meter.starts[index], nextFree);
    parts.push(`<circle cx="${at + 1.5}" cy="${y + 113.5}" r="1.5" fill="${bucket.color}"/>`);
    parts.push(caption(at + 7, y + 117, bucket.title, p.tertiary));
    nextFree = at + 7 + monoWidth(bucket.title, 10.5) + 12;
  });
  return parts.join("");
}

/** A legend row's lit dot, the same in its legend and its bar: Keep is neutral ink, a group its tint at 0.85. */
function legendDot(row: LegendRow, p: Palette): { fill: string; opacity?: number } {
  return row.color === GROUPS[3].color ? { fill: p.keep } : { fill: row.color, opacity: LIT_OPACITY };
}

function resourceCard(card: ResourceCard | undefined, x: number, y: number, p: Palette, format: ByteFormatter): string {
  const w = CARD_WIDTH;
  const pad = 16;
  const frame = surface(x, y, w, RESOURCE_HEIGHT, p);
  if (!card) return `${frame}${orbSVG(x + w / 2, y + RESOURCE_HEIGHT / 2, 16, 36, p.faint)}`;
  // The bar is the legend: each row's dots in its tint, Keep in neutral ink,
  // free space unlit, so every legend dot points at its part of the bar.
  const rows = card.legend.filter((row) => !row.free);
  const split = cardMeterDots(card.legend, card.usedBytes, card.totalBytes, dotsThatFit(w - 2 * pad));
  const meterDots: Array<{ fill: string; opacity?: number } | null> = [];
  rows.forEach((row, index) => {
    for (let i = 0; i < split.counts[index]; i += 1) meterDots.push(legendDot(row, p));
  });
  for (let i = 0; i < split.free; i += 1) meterDots.push(null);
  const meter = { svg: dotRow(x + pad, y + 78, meterDots, p) };
  const legend = card.legend
    .map((row, index) => {
      const column = index % 2;
      const rx = x + pad + column * ((w - 2 * pad) / 2 + 6);
      const ry = y + 100 + Math.floor(index / 2) * 18;
      const room = (w - 2 * pad) / 2 - 6;
      const value = row.bytes === undefined ? "…" : format(row.bytes);
      const fill = row.free ? null : legendDot(row, p);
      const dot = `<circle cx="${rx + 1.5}" cy="${ry - 3.5}" r="1.7" fill="${fill ? fill.fill : p.unlit}"${fill?.opacity ? ` fill-opacity="${fill.opacity}"` : ""}/>`;
      return `${dot}${text(rx + 9, ry, fitText(row.title, room - 9 - textWidth(value, 12) - 8, 12), p.secondary, 12)}${text(rx + room, ry, value, p.secondary, 12, { anchor: "end" })}`;
    })
    .join("");
  const careOn = !["Off", "Locked", "…"].includes(card.care);
  return [
    frame,
    icon(card.icon, x + pad, y + 13, p.secondary),
    text(x + pad + 24, y + 25, card.title, p.primary, 13, { weight: 500 }),
    caption(x + w - pad, y + 25, card.usage, p.tertiary, "end"),
    hero(x + pad, y + 62, `${card.center.value} ${card.center.label}`, p, 26),
    meter.svg,
    legend,
    hairline(x + pad, y + 124, x + w - pad, y + 124, p),
    `<circle cx="${x + pad + 1.5}" cy="${y + 137.5}" r="1.5" fill="${careOn ? p.accent : p.faint}"/>`,
    caption(x + pad + 9, y + 141, fitMono(`Auto Care · ${card.care}`, w - 2 * pad - 9, 10.5), p.tertiary),
  ].join("");
}

function folderRow(folder: FolderCard, x: number, y: number, width: number, p: Palette): string {
  const pad = 16;
  const status = folder.status;
  const statusWidth = textWidth(status, 15, 300);
  return [
    icon("folder", x + pad, y + 13, p.secondary),
    text(x + pad + 24, y + 25, fitText(folder.name, width - 2 * pad - 24 - statusWidth - 12, 13, 500), p.primary, 13, {
      weight: 500,
    }),
    text(x + width - pad, y + 26, status, p.primary, 15, { weight: 300, anchor: "end" }),
    caption(x + pad + 24, y + 43, fitMono(`Auto Care · ${folder.care}`, width - 2 * pad - 24, 10.5), p.tertiary),
  ].join("");
}

/** Mint at a glance. Returns the SVG and its height. */
export function glanceSVG(input: GlanceInput): { svg: string; height: number } {
  const p = palette(input.appearance);
  const parts: string[] = [];
  let y = 0;
  if (input.nudge) {
    parts.push(nudgeCard(input.nudge, y, p));
    y += NUDGE_HEIGHT + CARD_GAP;
  }
  parts.push(resourceCard(input.disk, 0, y, p, input.format));
  parts.push(resourceCard(input.memory, CARD_WIDTH + CARD_GAP, y, p, input.format));
  y += RESOURCE_HEIGHT;
  const folders = (input.folders ?? []).slice(0, 2);
  if (folders.length) {
    y += CARD_GAP;
    // One surface for the folders, a hairline between them, never a card per row.
    parts.push(surface(0, y, GLANCE_WIDTH, FOLDER_HEIGHT, p));
    const cell = folders.length > 1 ? GLANCE_WIDTH / 2 : GLANCE_WIDTH;
    folders.forEach((folder, index) => parts.push(folderRow(folder, index * cell, y, cell, p)));
    if (folders.length > 1) parts.push(hairline(cell, y + 12, cell, y + FOLDER_HEIGHT - 12, p));
    y += FOLDER_HEIGHT;
    if (input.moreFolders) {
      y += 18;
      parts.push(caption(GLANCE_WIDTH - 2, y, `${input.moreFolders} more in Mint`, p.tertiary, "end"));
    }
  }
  const height = Math.ceil(y + 2);
  return { svg: `${svgOpen(GLANCE_WIDTH, height)}${parts.join("")}</svg>`, height };
}

// ---------------------------------------------------------------------------
// Detail-pane pictures: a number, then where it sits in the whole. They take
// the place of sentences (Yukun: a picture says it once).
// ---------------------------------------------------------------------------

export const PANE_WIDTH = 420;

/**
 * A scan's pane: a forecast from recent durations, never Mint's weighted rule
 * fraction, marked estimated. The working orb beside the title, the share as
 * a light number, Mint's own location and count on one quiet row, and an ink
 * meter (a Scan has decided nothing yet) lit from the left. Only Mint's
 * answer replaces it with the result.
 */
export function scanProgressSVG(input: {
  appearance: Appearance;
  title: string;
  estimate: number;
  phase?: string;
  files?: number;
  /** The working orb's angle; the caller advances it while Mint works. */
  turn?: number;
}): {
  svg: string;
  height: number;
} {
  const p = palette(input.appearance);
  const w = PANE_WIDTH;
  const phase = input.phase?.replace(/\s+/g, " ").trim() || "Preparing scan…";
  // Native discovery phases append counters after the ellipsis. The quiet
  // subtitle names the current location; full diagnostics stay out of it.
  const copyPhases: Record<string, string> = {
    walking: "Reading files…",
    metadata: "Checking file details…",
    fingerprinting: "Comparing file contents…",
    hashing: "Comparing file contents…",
    checkingUse: "Checking files in use…",
    // Optimizable's idle-file stages, in Mint's own words (CloneDedupeStore.scanLabel).
    selectingCompression: "Checking idle files…",
    measuringCompression: "Checking idle files…",
  };
  const location = copyPhases[phase] ?? phase.split("…", 1)[0].trim();
  // These counters are observations already supplied by Mint, not a new
  // traversal or a denominator. Keep them on the same small location row.
  const entryCount =
    phase.match(/…\s*([\d,]+)\s+entries checked/)?.[1] ??
    phase.match(/…\s*已(?:检查|檢查)\s*([\d,]+)\s*(?:项|項)/)?.[1];
  const observed = entryCount ? Number(entryCount.replace(/,/g, "")) : phase === "walking" ? input.files : undefined;
  const checked =
    observed !== undefined && Number.isSafeInteger(observed) && observed >= 0
      ? `${observed.toLocaleString("en-US")} checked`
      : undefined;
  const locationWidth = checked ? w - monoWidth(checked, 10.5) - 20 : w;
  const fraction = Number.isFinite(input.estimate) ? Math.min(0.99, Math.max(0, input.estimate)) : 0;
  const count = dotsThatFit(w);
  const lit = Math.floor(fraction * count);
  const dots = Array.from({ length: count }, (_, index) => (index < lit ? { fill: p.primary, opacity: 0.92 } : null));
  const height = 104;
  return {
    svg: `${svgOpen(w, height)}
${orbSVG(7, 13, 14, 24, p.primary, input.turn ?? 0.6)}
${text(22, 18, fitText(input.title, w - 22 - monoWidth("estimated", 10.5) - 12, 13, 500), p.secondary, 13, { weight: 500 })}
${caption(w, 18, "estimated", p.tertiary, "end")}
${hero(0, 56, `${Math.floor(fraction * 100)}%`, p, 30)}
${text(0, 78, fitText(location, locationWidth, 12.5), p.secondary, 12.5)}
${checked ? caption(w, 78, checked, p.tertiary, "end") : ""}
${dotRow(0, 96, dots, p)}
</svg>`,
    height,
  };
}

export type ListRow = {
  title: string;
  detail?: string;
  value: string;
  color?: string;
  /** Done: drawn faint with a line through it, as the app strikes a row before it folds away. */
  struck?: boolean;
};
/** A part of the whole a group belongs to; the group's own part is lit. */
export type WholePart = { bytes: number; lit: boolean };

/**
 * A group's contents: its total as a light number, one line of what it is,
 * where it sits in the whole (a dot meter, its share lit in its colour), then
 * its rows on one surface, largest first.
 */
export function listSVG(input: {
  appearance: Appearance;
  value: string;
  label: string;
  color: string;
  rows: ListRow[];
  more?: string;
  whole?: WholePart[];
}): { svg: string; height: number } {
  const p = palette(input.appearance);
  const w = PANE_WIDTH;
  const color = input.color;
  let meter = "";
  if (input.whole) {
    const lit = input.whole.filter((part) => part.lit).reduce((s, part) => s + Math.max(0, part.bytes), 0);
    const all = input.whole.reduce((s, part) => s + Math.max(0, part.bytes), 0);
    meter = dotMeter(0, 74, w, [{ bytes: lit, color }], p, all).svg;
  }
  const top = input.whole ? 108 : 90;
  const step = 26;
  const rows = input.rows
    .map((row, index) => {
      const y = top + index * step;
      const dot = row.color ? `<circle cx="1.7" cy="${y - 4}" r="1.7" fill="${row.color}"/>` : "";
      const x = row.color ? 12 : 0;
      // Columns by the room each label takes: the size at the right edge, the
      // detail ending 96 pt before it, the title in whatever is left of that.
      const valueStart = w - Math.max(textWidth(row.value, 13), 60) - 14;
      const detailText = row.detail ? fitMono(row.detail, 130, 10.5) : "";
      const detailEnd = Math.min(w - 96, valueStart);
      const titleEnd = row.detail ? detailEnd - monoWidth(detailText, 10.5) - 14 : valueStart;
      const detail = row.detail ? caption(detailEnd, y, detailText, p.tertiary, "end") : "";
      const title = text(x, y, fitText(row.title, titleEnd - x, 13), row.struck ? p.tertiary : p.primary, 13);
      const value = text(w, y, row.value, row.struck ? p.tertiary : p.secondary, 13, { anchor: "end" });
      const strike = row.struck ? hairlineStrike(x, y - 4.5, w, p) : "";
      return `<g opacity="${row.struck ? 0.75 : 1}">${dot}${title}${detail}${value}${strike}</g>${index < input.rows.length - 1 ? hairline(0, y + 9, w, y + 9, p) : ""}`;
    })
    .join("");
  const end = top + Math.max(0, input.rows.length - 1) * step + 10;
  const more = input.more ? caption(0, end + 20, input.more, p.tertiary) : "";
  const height = end + (input.more ? 28 : 6);
  const label = `<circle cx="1.7" cy="${54 - 4}" r="1.7" fill="${color}"${dotOpacity(color, p) ? ` fill-opacity="${LIT_OPACITY}"` : ""}/>${text(10, 54, fitText(input.label, w - 10, 13), p.secondary, 13)}`;
  const svg = `${svgOpen(w, height)}
${hero(0, 30, input.value, p, 30)}
${label}
${meter}
${rows}
${more}
</svg>`;
  return { svg, height };
}

function hairlineStrike(x1: number, y: number, x2: number, p: Palette): string {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${p.secondary}" stroke-width="0.8"/>`;
}

/** `value` cut to fit `room` pt in the caption face. */
function fitMono(value: string, room: number, size: number): string {
  if (monoWidth(value, size) <= room) return value;
  const chars = [...value];
  const keep = Math.max(1, Math.floor(room / (0.61 * size)) - 1);
  return `${chars.slice(0, keep).join("").trimEnd()}…`;
}

export type TrendPoint = { at: number; bytes: number | null };

/**
 * One thing's size over time: its size now, how much it moved in the window,
 * then the island's halftone as a line: one lit dot per moment at its size,
 * in full ink, the window's in the colour, on the unlit grid. A moment Mint
 * did not record is an empty column, never zero.
 */
export function trendSVG(input: {
  appearance: Appearance;
  value: string;
  change: string;
  color: string;
  points: TrendPoint[];
  windowStart?: number;
  windowLabel?: string;
  format: ByteFormatter;
  startLabel: string;
  endLabel: string;
}): { svg: string; height: number } {
  const p = palette(input.appearance);
  const w = PANE_WIDTH;
  const top = 80;
  const chartHeight = 132;
  const bottom = top + chartHeight;
  const known = input.points.filter((point) => point.bytes !== null) as Array<{ at: number; bytes: number }>;
  const max = Math.max(1, ...known.map((point) => point.bytes));
  const min = Math.min(max, ...known.map((point) => point.bytes));
  // Start the axis a little under the smallest value so a change reads as a change.
  const floor = Math.max(0, min - (max - min) * 0.35);
  const columns = 60;
  const values = columnValues(
    input.points.map((point) => ({ at: point.at, value: point.bytes })),
    columns,
  );
  const first = input.points[0]?.at ?? 0;
  const last = input.points[input.points.length - 1]?.at ?? first;
  const columnAt = (column: number) => first + ((last - first) * column) / Math.max(1, columns - 1);
  const inWindow = (column: number) => input.windowStart === undefined || columnAt(column) >= input.windowStart;
  const chart = halftone(
    0,
    top,
    w,
    chartHeight,
    values,
    18,
    p,
    (column) => (inWindow(column) ? input.color : p.primary),
    floor,
    true,
  );
  const windowColumn = values.findIndex((_, column) => inWindow(column));
  const windowMark =
    input.windowStart !== undefined && input.windowStart > first && input.windowLabel && windowColumn > 0
      ? caption(
          Math.min((windowColumn * w) / columns + 2, w - monoWidth(input.windowLabel, 10.5)),
          top - 8,
          input.windowLabel,
          p.tertiary,
        )
      : "";
  const height = bottom + 24;
  const svg = `${svgOpen(w, height)}
${hero(0, 30, input.value, p, 30)}
<circle cx="1.7" cy="50" r="1.7" fill="${input.color}"/>${text(10, 54, input.change, p.secondary, 13)}
${windowMark}
${caption(0, top - 8, input.format(max), p.tertiary)}
${chart}
${caption(0, bottom + 18, input.startLabel, p.tertiary)}
${caption(w, bottom + 18, input.endLabel, p.tertiary, "end")}
</svg>`;
  return { svg, height };
}

// ---------------------------------------------------------------------------
// The plan wall (2026-11-10): a small copy of Mint's plan page. Left, on a
// surface, what Mint has done here and its 3-year value with the page's own
// chart (Mint sends both lines' points, PlanPageRoomChart.Geometry.lines);
// right, the page's title, what is ready now, and the two plans, each with
// the key that buys it.
// ---------------------------------------------------------------------------

export type PlanWallValue = {
  title: string;
  estimate: string;
  worthText: string;
  line: string;
  /** The page's drawing: points in a `width` × `height` frame, Today at x 0. */
  chart: { width: number; height: number; axis?: number; mint: number[][]; never: number[][] };
  gapLabel: string;
  withMint: string;
  neverClean: string;
  today: string;
  threeYears: string;
  sentence: string;
  footer: Array<{ figure: string; label: string }>;
};

export type PlanWallInput = {
  appearance: Appearance;
  format: ByteFormatter;
  title: string;
  status?: string;
  value?: PlanWallValue;
  /** `figure` is the page's own "6 GB" when Mint sent it; else the bytes are written by `format`. */
  ready: {
    bytes: number;
    figure?: string;
    label: string;
    parts: Array<{ title: string; bytes: number; color: string }>;
  };
  plans: Array<{ price: string; suffix?: string; line: string; terms: string; key: string }>;
  /** The page's "what a plan changes" rows, shown in ready now's place when nothing is ready. */
  unlocks?: Array<{ name: string; free: string; plan: string; planSize: number }>;
};

const PLAN_LEFT = 318;
const PLAN_GUTTER = 24;
const PLAN_RIGHT = 338;
const PLAN_HEIGHT = 316;

/** `terms` broken at its " · " into lines that fit `room` at `size`. */
export function wrapTerms(terms: string, room: number, size: number): string[] {
  const lines: string[] = [];
  for (const piece of terms.split(" · ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && textWidth(`${last} · ${piece}`, size) <= room)
      lines[lines.length - 1] = `${last} · ${piece}`;
    else lines.push(piece);
  }
  return lines;
}

/** The y of a polyline at x, between its points. */
function lineYAt(points: number[][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x0, y0] = points[index - 1];
    if (x <= x1) return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return points[points.length - 1][1];
}

/**
 * Where the gap's figure fits between the two lines, from the gap's middle
 * rightwards, short of the lines' ends (the page's own rule); undefined when
 * it fits nowhere, and it is then left out, as the page does.
 */
export function gapLabelBox(
  mint: number[][],
  never: number[][],
  width: number,
  label: { width: number; height: number },
): { x: number; y: number } | undefined {
  const pad = 3;
  for (let center = 0.58; center * width + label.width / 2 <= width - 10; center += 0.02) {
    const left = center * width - label.width / 2;
    let above = -Infinity;
    let below = Infinity;
    for (let x = left; x <= left + label.width; x += 2) {
      above = Math.max(above, lineYAt(mint, x));
      below = Math.min(below, lineYAt(never, x));
    }
    if (below - above >= label.height + 2 * pad) return { x: center * width, y: (above + below) / 2 };
  }
  return undefined;
}

function roomChart(value: PlanWallValue, x: number, y: number, width: number, height: number, p: Palette): string {
  const chart = value.chart;
  const sx = width / chart.width;
  const sy = height / chart.height;
  const at = (point: number[]) => `${round(x + point[0] * sx)},${round(y + point[1] * sy)}`;
  const mint = chart.mint;
  const never = chart.never;
  const gap = [...mint, ...[...never].reverse()].map(at).join(" ");
  const axisY = y + (chart.axis ?? chart.height - 16) * sy;
  const mintEnd = mint[mint.length - 1];
  const neverEnd = never[never.length - 1];
  const parts = [
    `<polygon points="${gap}" fill="${p.accent}" fill-opacity="0.16"/>`,
    `<line x1="${x}" y1="${round(axisY)}" x2="${x + width}" y2="${round(axisY)}" stroke="${p.faint}" stroke-width="0.8"/>`,
    `<polyline points="${never.map(at).join(" ")}" fill="none" stroke="${p.tertiary}" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="0 4.2"/>`,
    `<polyline points="${mint.map(at).join(" ")}" fill="none" stroke="${p.primary}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<circle cx="${round(x + mintEnd[0] * sx)}" cy="${round(y + mintEnd[1] * sy)}" r="2.4" fill="${p.primary}"/>`,
    `<circle cx="${round(x + neverEnd[0] * sx)}" cy="${round(y + neverEnd[1] * sy)}" r="2.3" fill="none" stroke="${p.secondary}" stroke-width="1.2"/>`,
    text(x + width - 8, y + mintEnd[1] * sy - 7, value.withMint, p.secondary, 10, { weight: 500, anchor: "end" }),
    text(x + width - 8, y + neverEnd[1] * sy + 14, value.neverClean, p.tertiary, 10, { weight: 500, anchor: "end" }),
    caption(x, y + height - 1, value.today, p.tertiary),
    caption(x + width, y + height - 1, value.threeYears, p.tertiary, "end"),
  ];
  // The figure in the gap, in the page's own units, then drawn at this scale.
  const size = 12;
  const box = gapLabelBox(mint, never, chart.width, {
    width: textWidth(value.gapLabel, size, 700) / sx,
    height: (size * 0.9) / sy,
  });
  if (box) {
    parts.push(
      text(x + box.x * sx, y + box.y * sy + size * 0.36, value.gapLabel, p.accent, size, {
        weight: 700,
        anchor: "middle",
      }),
    );
  }
  return parts.join("");
}

function valuePanel(value: PlanWallValue, p: Palette): string {
  const w = PLAN_LEFT;
  const pad = 18;
  const chipText = value.estimate;
  const chipWidth = monoWidth(chipText, 9.5) + 14;
  const footer = value.footer
    .map((count, index) => {
      const fx = pad + index * 112;
      return `${text(fx, 284, count.figure, p.primary, 15)}${caption(fx, 300, count.label, p.tertiary)}`;
    })
    .join("");
  return [
    surface(0, 0, w, PLAN_HEIGHT, p),
    text(pad, 30, fitText(value.title, w - 2 * pad - chipWidth - 10, 12.5, 500), p.secondary, 12.5, { weight: 500 }),
    `<rect x="${round(w - pad - chipWidth)}" y="18" width="${round(chipWidth)}" height="17" rx="8.5" fill="none" stroke="${p.faint}" stroke-width="0.8"/>`,
    text(w - pad - chipWidth / 2, 30, chipText, p.tertiary, 9.5, { mono: true, anchor: "middle" }),
    hero(pad, 78, value.worthText, p, 42),
    text(pad, 100, fitText(value.line, w - 2 * pad, 12), p.secondary, 12),
    roomChart(value, pad, 116, w - 2 * pad, 112, p),
    text(pad, 250, fitText(value.sentence, w - 2 * pad, 11), p.tertiary, 11),
    hairline(pad, 262, w - pad, 262, p),
    footer,
  ].join("");
}

/** One of the page's comparison rows: the name, the free side struck through, then the plan's side. */
function unlockRow(
  row: NonNullable<PlanWallInput["unlocks"]>[number],
  x: number,
  y: number,
  width: number,
  p: Palette,
) {
  const planWidth = Math.max(66, textWidth(row.plan, row.planSize, 600));
  const planX = x + width - planWidth;
  const arrowX = planX - 14;
  const freeEnd = arrowX - 10;
  const freeWidth = monoWidth(row.free, 11);
  return [
    text(x, y, fitText(row.name, freeEnd - freeWidth - 12 - x, 13.5, 500), p.primary, 13.5, { weight: 500 }),
    text(freeEnd, y, row.free, p.tertiary, 11, { mono: true, anchor: "end" }),
    `<line x1="${round(freeEnd - freeWidth)}" y1="${round(y - 3.8)}" x2="${round(freeEnd)}" y2="${round(y - 3.8)}" stroke="${p.tertiary}" stroke-width="0.8"/>`,
    text(arrowX, y, "→", p.faint, 11, { anchor: "middle" }),
    text(planX, y + (row.planSize > 14 ? 1.5 : 0), row.plan, p.primary, row.planSize, { weight: 600 }),
  ].join("");
}

function offerColumn(input: PlanWallInput, x: number, width: number, p: Palette): string {
  const parts: string[] = [];
  parts.push(text(x, 28, fitText(input.title, width, 22, 600), p.primary, 22, { weight: 600 }));
  if (input.status) {
    parts.push(`<circle cx="${x + 2}" cy="${46.5}" r="2" fill="${p.warn}"/>`);
    parts.push(text(x + 10, 50, fitText(input.status, width - 10, 12), p.secondary, 12));
  }
  // What is ready now: the figure, the page's accent label, the meter in the buckets' colours;
  // nothing when Mint knows of nothing (the page hides "ready now" at 0).
  const ready = input.ready.bytes > 0 || Boolean(input.ready.figure);
  if (ready) {
    parts.push(hero(x, 100, input.ready.figure ?? input.format(input.ready.bytes), p, 32));
    parts.push(text(x, 120, input.ready.label, p.accent, 12.5, { weight: 500 }));
  }
  if (ready && input.ready.parts.length) {
    parts.push(dotMeter(x, 138, width, input.ready.parts, p).svg);
    const cell = width / 2;
    input.ready.parts.forEach((part, index) => {
      const cx = x + index * cell;
      const value = input.format(part.bytes);
      parts.push(`<circle cx="${cx + 1.7}" cy="${155.5}" r="1.7" fill="${part.color}" fill-opacity="${LIT_OPACITY}"/>`);
      parts.push(text(cx + 9, 159, fitText(part.title, cell - 9 - textWidth(value, 12) - 18, 12), p.secondary, 12));
      parts.push(text(cx + cell - 12, 159, value, p.secondary, 12, { anchor: "end" }));
    });
  }
  // Nothing ready (the page hides "ready now" at 0): the page's own rows of what a plan changes,
  // so the column never has a hole above the plans.
  if (!ready && input.unlocks?.length) {
    input.unlocks.slice(0, 2).forEach((row, index) => {
      const y = 104 + index * 36;
      parts.push(unlockRow(row, x, y, width, p));
      if (index === 0) parts.push(hairline(x, y + 17, x + width, y + 17, p));
    });
  }
  // The plans, as the page's tiles: the price leads, then its line and its terms; the key that buys it.
  const gap = 10;
  const tileWidth = (width - gap) / input.plans.length - (input.plans.length > 1 ? gap / input.plans.length : 0);
  const top = 180;
  const tileHeight = 120;
  input.plans.forEach((plan, index) => {
    const tx = x + index * (tileWidth + gap);
    const inner = tileWidth - 28;
    const keyWidth = monoWidth(plan.key, 10) + 10;
    const priceWidth = textWidth(plan.price, 24, 300) * 0.93;
    parts.push(
      `<rect x="${round(tx + 0.4)}" y="${top + 0.4}" width="${round(tileWidth - 0.8)}" height="${tileHeight - 0.8}" rx="13" fill="${p.surface}" stroke="${index === 0 ? p.faint : p.hairline}" stroke-width="${index === 0 ? 1 : 0.6}"/>`,
    );
    parts.push(text(tx + 14, top + 34, plan.price, p.primary, 24, { weight: 300 }));
    if (plan.suffix)
      parts.push(text(tx + 14 + priceWidth + 3, top + 34, plan.suffix, p.tertiary, 12.5, { weight: 500 }));
    parts.push(
      `<rect x="${round(tx + tileWidth - 12 - keyWidth)}" y="${top + 12}" width="${round(keyWidth)}" height="16" rx="4" fill="none" stroke="${p.faint}" stroke-width="0.8"/>`,
    );
    parts.push(
      text(tx + tileWidth - 12 - keyWidth / 2, top + 23.5, plan.key, p.tertiary, 10, { mono: true, anchor: "middle" }),
    );
    parts.push(text(tx + 14, top + 54, fitText(plan.line, inner, 12), p.secondary, 12));
    wrapTerms(plan.terms, inner, 10.5)
      .slice(0, 3)
      .forEach((line, row) =>
        parts.push(text(tx + 14, top + 76 + row * 14, fitText(line, inner, 10.5), p.tertiary, 10.5)),
      );
  });
  return parts.join("");
}

/** The plan wall. Returns the SVG and its size; without Mint's value (Mint 1.2.0) only the right column. */
export function planWallSVG(input: PlanWallInput): { svg: string; width: number; height: number } {
  const p = palette(input.appearance);
  if (!input.value) {
    const width = PLAN_RIGHT + 40;
    return {
      svg: `${svgOpen(width, PLAN_HEIGHT)}${offerColumn(input, 0, width, p)}</svg>`,
      width,
      height: PLAN_HEIGHT,
    };
  }
  const width = PLAN_LEFT + PLAN_GUTTER + PLAN_RIGHT;
  const svg = `${svgOpen(width, PLAN_HEIGHT)}${valuePanel(input.value, p)}${offerColumn(input, PLAN_LEFT + PLAN_GUTTER, PLAN_RIGHT, p)}</svg>`;
  return { svg, width, height: PLAN_HEIGHT };
}
