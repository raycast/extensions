import { formatBits } from "./format";
import { TrafficSample } from "./use-traffic";

/** Size the panel is shown at. It is drawn at twice this so it stays sharp on Retina screens. */
export const PANEL_WIDTH = 440;
const SCALE = 2;
// Samples further apart than this are drawn as separate lines, so a gap shows as a gap.
const BREAK_AFTER_MS = 2500;

/*
 * Vertical layout. Every section is separated by GAP, and text is placed by its cap height
 * so padding looks even above and below it.
 */
const GAP = 22;
const HEADER = { top: 0, height: 60 };
// The toolbar heads both the cards and the chart, since they show the same measurement.
const TOOLBAR = { top: HEADER.top + HEADER.height + GAP, height: 22 };
const CARDS = { top: TOOLBAR.top + TOOLBAR.height + 12, height: 70, padding: 16 };
// Leaves room above the plot for the scale label.
const PLOT = { top: CARDS.top + CARDS.height + 24, height: 72 };
const AXIS_BASELINE = PLOT.top + PLOT.height + 16;
const DETAILS = { top: AXIS_BASELINE + 18, rowHeight: 52, rows: 2, columns: 3, padding: 14 };
export const PANEL_HEIGHT = DETAILS.top + DETAILS.rowHeight * DETAILS.rows;

export type Tone = "green" | "yellow" | "orange" | "gray";

export interface MonitorPanel {
  name: string;
  subtitle: string;
  status: { label: string; tone: Tone };
  /** Latest rates in bytes per second, if any were measured. */
  down?: number;
  up?: number;
  windowMs: number;
  /** Shown at the bottom in every state, three to a row. */
  details: { label: string; value: string }[];
  /** Shown when the tunnel is being measured. */
  traffic?: { samples: TrafficSample[]; now: number };
  /** Shown instead of the chart when there's nothing to measure. */
  empty?: { icon: "shield" | "warning" | "progress"; title: string; text: string; hint?: string };
}

interface Palette {
  text: string;
  muted: string;
  faint: string;
  card: string;
  border: string;
  grid: string;
  down: string;
  up: string;
  key: string;
  tones: Record<Tone, { fg: string; bg: string; border: string }>;
}

const DARK: Palette = {
  text: "#ECEDF2",
  muted: "#9A9CA8",
  faint: "#73757F",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.09)",
  grid: "rgba(255,255,255,0.10)",
  down: "#5DE1AD",
  up: "#A28CFF",
  key: "rgba(255,255,255,0.06)",
  tones: {
    green: { fg: "#6EE5AB", bg: "rgba(75,220,156,0.12)", border: "rgba(75,220,156,0.28)" },
    yellow: { fg: "#F5CF5B", bg: "rgba(245,207,91,0.12)", border: "rgba(245,207,91,0.28)" },
    orange: { fg: "#FFB066", bg: "rgba(255,176,102,0.12)", border: "rgba(255,176,102,0.28)" },
    gray: { fg: "#A4A5B0", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
  },
};

const LIGHT: Palette = {
  text: "#1C1C21",
  muted: "#666874",
  faint: "#8C8E98",
  card: "rgba(0,0,0,0.025)",
  border: "rgba(0,0,0,0.09)",
  grid: "rgba(0,0,0,0.10)",
  down: "#16A874",
  up: "#7A5AF8",
  key: "rgba(0,0,0,0.04)",
  tones: {
    green: { fg: "#13895F", bg: "rgba(22,168,116,0.10)", border: "rgba(22,168,116,0.28)" },
    yellow: { fg: "#9A7300", bg: "rgba(214,160,0,0.10)", border: "rgba(214,160,0,0.28)" },
    orange: { fg: "#B35900", bg: "rgba(230,120,0,0.10)", border: "rgba(230,120,0,0.28)" },
    gray: { fg: "#666874", bg: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.10)" },
  },
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Estimates how wide text renders in SF Pro, in pixels. SVG can't measure text, and pills
 * only look balanced when their padding is the same on both sides.
 */
function textWidth(text: string, size: number, bold = false): number {
  let em = 0;
  for (const ch of text) {
    if ("iljft.,:;'|! ".includes(ch)) em += 0.29;
    else if ("rI".includes(ch)) em += 0.38;
    else if ("mwMW".includes(ch)) em += 0.86;
    else if (/[A-Z]/.test(ch)) em += 0.66;
    else if (/[0-9]/.test(ch)) em += 0.6;
    else em += 0.55;
  }
  return em * size * (bold ? 1.04 : 1);
}

/** Distance from the baseline to the top of capital letters, as a share of the font size. */
const CAP = 0.7;

/** Shortens text with an ellipsis until it fits in `width` pixels. */
function fit(text: string, size: number, width: number, bold = false): string {
  if (textWidth(text, size, bold) <= width) return text;
  let cut = text;
  while (cut.length > 1 && textWidth(`${cut}…`, size, bold) > width) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.slice(0, 3);
}

function splitAtGaps(samples: TrafficSample[]): TrafficSample[][] {
  const runs: TrafficSample[][] = [];
  for (const sample of samples) {
    const run = runs[runs.length - 1];
    if (run && sample.time - run[run.length - 1].time <= BREAK_AFTER_MS) run.push(sample);
    else runs.push([sample]);
  }
  return runs;
}

/** Rounds up to 1, 2 or 5 times a power of ten so the scale lands on a readable value. */
function niceMax(value: number): number {
  const floor = Math.max(value * 1.15, 1000);
  const magnitude = 10 ** Math.floor(Math.log10(floor));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= floor) ?? 10;
  return step * magnitude;
}

function header(panel: MonitorPanel, c: Palette): string {
  const tone = c.tones[panel.status.tone];
  const labelSize = 11;
  const dot = 6;
  const gap = 7;
  const padding = 14;
  const pillHeight = 28;
  const labelWidth = textWidth(panel.status.label, labelSize, true);
  const pillWidth = padding + dot + gap + labelWidth + padding;
  const pillX = PANEL_WIDTH - pillWidth;
  // Centered on the header block, from the top of the eyebrow to the bottom of the subtitle.
  const center = HEADER.top + HEADER.height / 2;
  const pillY = center - pillHeight / 2;
  // Anchored at its middle, so if the width estimate is off the error splits evenly between
  // the gap and the right padding instead of landing on one side.
  const labelCenter = pillX + padding + dot + gap + labelWidth / 2;

  return `
<text x="0" y="${HEADER.top + 12}" font-size="9.5" font-weight="600" letter-spacing="1.2" fill="${c.faint}">NETWORK MONITOR</text>
<text x="0" y="${HEADER.top + 39}" font-size="20" font-weight="700" letter-spacing="-0.4" fill="${c.text}">${esc(fit(panel.name, 20, pillX - 16, true))}</text>
<text x="0" y="${HEADER.top + 58}" font-size="11.5" fill="${c.muted}">${esc(fit(panel.subtitle, 11.5, pillX - 16))}</text>
<rect x="${pillX + 0.5}" y="${pillY + 0.5}" width="${pillWidth - 1}" height="${pillHeight - 1}" rx="${pillHeight / 2}" fill="${tone.bg}" stroke="${tone.border}"/>
<circle cx="${pillX + padding + dot / 2}" cy="${center}" r="${dot / 2}" fill="${tone.fg}"/>
<text x="${labelCenter}" y="${center + (labelSize * CAP) / 2}" font-size="${labelSize}" font-weight="600" text-anchor="middle" fill="${tone.fg}">${esc(panel.status.label)}</text>`;
}

function card(
  x: number,
  width: number,
  icon: "download" | "upload",
  color: string,
  title: string,
  rate: number | undefined,
  c: Palette,
): string {
  // In bits, the unit ISPs and speed tests use, so the number reads as people expect.
  const [value, unit] = rate === undefined ? ["—", ""] : formatBits(rate).split(" ");
  const left = x + CARDS.padding;
  // The title's cap top sits CARDS.padding from the top, the value's baseline CARDS.padding from the bottom.
  const titleBaseline = CARDS.top + CARDS.padding + 11 * CAP;
  const valueBaseline = CARDS.top + CARDS.height - CARDS.padding;
  // A tinted badge on the right, centered on the card so it balances the title and value.
  const badge = 32;
  const glyph = 18;
  const badgeX = x + width - CARDS.padding - badge;
  const badgeY = CARDS.top + (CARDS.height - badge) / 2;

  return `
<rect x="${x + 0.5}" y="${CARDS.top + 0.5}" width="${width - 1}" height="${CARDS.height - 1}" rx="12" fill="${c.card}" stroke="${c.border}"/>
<rect x="${badgeX}" y="${badgeY}" width="${badge}" height="${badge}" rx="9" fill="${color}" fill-opacity="0.14"/>
<g transform="translate(${badgeX + (badge - glyph) / 2} ${badgeY + (badge - glyph) / 2}) scale(${glyph / 24})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g>
<text x="${left}" y="${titleBaseline}" font-size="11" font-weight="500" fill="${c.muted}">${title}</text>
<text x="${left}" y="${valueBaseline}" fill="${rate === undefined ? c.faint : c.text}"><tspan font-size="26" font-weight="700" letter-spacing="-0.8">${value}</tspan><tspan dx="4" font-size="12" font-weight="500" fill="${c.muted}">${unit}</tspan></text>`;
}

/** Section title. The legend and range only show while there's a chart for them to describe. */
function toolbar(minutes: boolean | undefined, c: Palette): string {
  const center = TOOLBAR.top + TOOLBAR.height / 2;
  const labelBaseline = (size: number) => center + (size * CAP) / 2;

  // The panel is an image, so it can't hold a clickable control. Name the range and the
  // shortcut that changes it instead.
  const keycap = { width: 26, height: 17 };
  const keycapX = PANEL_WIDTH - keycap.width;
  const title = `<text x="0" y="${labelBaseline(13)}" font-size="13" font-weight="600" fill="${c.text}">Throughput</text>`;
  if (minutes === undefined) return title;

  const range = minutes ? "Last 5 minutes" : "Last minute";
  const rangeX = keycapX - 6;
  // Legend, laid out right to left so it keeps the same gap to the control.
  const items = [
    { label: "Upload", color: c.up },
    { label: "Download", color: c.down },
  ];
  let right = rangeX - textWidth(range, 10) - 16;
  const legend = items
    .map(({ label, color }) => {
      const textX = right - textWidth(label, 10);
      const dotX = textX - 8;
      right = dotX - 3 - 14;
      return `<circle cx="${dotX}" cy="${center}" r="3" fill="${color}"/><text x="${textX}" y="${labelBaseline(10)}" font-size="10" fill="${c.muted}">${label}</text>`;
    })
    .join("");

  return `
${title}
${legend}
<text x="${rangeX}" y="${labelBaseline(10)}" font-size="10" text-anchor="end" fill="${c.muted}">${range}</text>
<rect x="${keycapX + 0.5}" y="${center - keycap.height / 2 + 0.5}" width="${keycap.width - 1}" height="${keycap.height - 1}" rx="4" fill="${c.key}" stroke="${c.border}"/>
<text x="${keycapX + keycap.width / 2}" y="${labelBaseline(9.5)}" font-size="9.5" font-weight="500" text-anchor="middle" fill="${c.muted}">⌘T</text>`;
}

function chart(panel: MonitorPanel, traffic: NonNullable<MonitorPanel["traffic"]>, c: Palette): string {
  const bottom = PLOT.top + PLOT.height;
  const start = traffic.now - panel.windowMs;
  const visible = traffic.samples.filter((s) => s.time >= start);
  // Rounded in bits so the scale label, which is in bits, lands on a round number.
  const max = niceMax(Math.max(0, ...visible.map((s) => Math.max(s.down, s.up))) * 8) / 8;
  const x = (time: number) => (((time - start) / panel.windowMs) * PANEL_WIDTH).toFixed(1);
  const y = (rate: number) => (bottom - (Math.min(rate, max) / max) * PLOT.height).toFixed(1);

  const series = (key: "down" | "up", color: string, gradient: string) =>
    splitAtGaps(visible)
      .map((run) => {
        const points = run.map((s) => `${x(s.time)},${y(s[key])}`).join(" L");
        const area =
          run.length > 1
            ? `<path d="M${x(run[0].time)},${bottom} L${points} L${x(run[run.length - 1].time)},${bottom} Z" fill="url(#${gradient})"/>`
            : "";
        return `${area}<path d="M${points}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>`;
      })
      .join("");

  const gridlines = [0, 0.5]
    .map((f) => {
      const lineY = (PLOT.top + f * PLOT.height).toFixed(1);
      return `<line x1="0" x2="${PANEL_WIDTH}" y1="${lineY}" y2="${lineY}" stroke="${c.grid}" stroke-dasharray="2 4"/>`;
    })
    .join("");

  const minutes = panel.windowMs >= 120_000;
  const axis = [1, 0.75, 0.5, 0.25, 0]
    .map((f, i) => {
      const seconds = (panel.windowMs / 1000) * f;
      const ago = i === 0 ? " ago" : "";
      const label =
        f === 0
          ? "Now"
          : minutes
            ? `${Math.floor(seconds / 60)}m${seconds % 60 ? ` ${seconds % 60}s` : ""}${ago}`
            : `${seconds}s${ago}`;
      const anchor = i === 0 ? "start" : i === 4 ? "end" : "middle";
      return `<text x="${(1 - f) * PANEL_WIDTH}" y="${AXIS_BASELINE}" font-size="9.5" fill="${c.faint}" text-anchor="${anchor}">${label}</text>`;
    })
    .join("");

  return `
<defs>
  <linearGradient id="dl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c.down}" stop-opacity="0.24"/><stop offset="1" stop-color="${c.down}" stop-opacity="0"/></linearGradient>
  <linearGradient id="ul" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c.up}" stop-opacity="0.16"/><stop offset="1" stop-color="${c.up}" stop-opacity="0"/></linearGradient>
</defs>
${gridlines}
<text x="${PANEL_WIDTH}" y="${PLOT.top - 5}" font-size="8.5" text-anchor="end" fill="${c.faint}">Scale max ${formatBits(max).replace(/\.0+ /, " ")}</text>
${series("up", c.up, "ul")}
${series("down", c.down, "dl")}
<line x1="0" x2="${PANEL_WIDTH}" y1="${bottom + 0.5}" y2="${bottom + 0.5}" stroke="${c.border}"/>
${axis}`;
}

/** One card split into a grid of equal cells, padded the same on every side like the cards above. */
function details(items: MonitorPanel["details"], c: Palette): string {
  const cellWidth = PANEL_WIDTH / DETAILS.columns;
  const height = DETAILS.rowHeight * DETAILS.rows;
  const inset = 12;

  const rowLines = Array.from({ length: DETAILS.rows - 1 }, (_, i) => {
    const y = DETAILS.top + (i + 1) * DETAILS.rowHeight + 0.5;
    return `<line x1="${DETAILS.padding}" x2="${PANEL_WIDTH - DETAILS.padding}" y1="${y}" y2="${y}" stroke="${c.border}"/>`;
  });
  const columnLines = Array.from({ length: DETAILS.rows * (DETAILS.columns - 1) }, (_, i) => {
    const row = Math.floor(i / (DETAILS.columns - 1));
    const x = ((i % (DETAILS.columns - 1)) + 1) * cellWidth + 0.5;
    const top = DETAILS.top + row * DETAILS.rowHeight;
    return `<line x1="${x}" x2="${x}" y1="${top + inset}" y2="${top + DETAILS.rowHeight - inset}" stroke="${c.border}"/>`;
  });

  const cells = items.slice(0, DETAILS.rows * DETAILS.columns).map((item, i) => {
    const x = (i % DETAILS.columns) * cellWidth + DETAILS.padding;
    const top = DETAILS.top + Math.floor(i / DETAILS.columns) * DETAILS.rowHeight;
    const width = cellWidth - DETAILS.padding * 2;
    const empty = item.value === "—";
    return `
<text x="${x}" y="${top + DETAILS.padding + 9.5 * CAP}" font-size="9.5" fill="${c.faint}">${esc(item.label)}</text>
<text x="${x}" y="${top + DETAILS.rowHeight - DETAILS.padding}" font-size="12" font-weight="600" fill="${empty ? c.faint : c.text}">${esc(fit(item.value, 12, width, true))}</text>`;
  });

  return `
<rect x="0.5" y="${DETAILS.top + 0.5}" width="${PANEL_WIDTH - 1}" height="${height - 1}" rx="12" fill="${c.card}" stroke="${c.border}"/>
${rowLines.join("")}${columnLines.join("")}${cells.join("")}`;
}

const ICONS = {
  shield: `<path d="M12 2 4 6v6c0 5.5 3.3 8.5 8 10 4.7-1.5 8-4.5 8-10V6l-8-4Z"/><path d="M9 12h6"/>`,
  warning: `<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17v.5"/>`,
  progress: `<circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/><path d="M12 8v4l3 2"/>`,
  download: `<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>`,
  upload: `<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>`,
};

function emptyState(empty: NonNullable<MonitorPanel["empty"]>, c: Palette): string {
  const mid = PANEL_WIDTH / 2;
  const lines = wrap(empty.text, 56);
  const icon = 40;
  const lineHeight = 16;

  // Measure the block, then center it between the section title and the details. The rate
  // cards are left out here, since there's nothing for them to show.
  const height = icon + 16 + 14 * CAP + 10 + lines.length * lineHeight + (empty.hint ? 20 : 0);
  const areaTop = TOOLBAR.top + TOOLBAR.height;
  let y = areaTop + (DETAILS.top - areaTop - height) / 2;

  const iconY = y;
  y += icon + 16 + 14 * CAP;
  const titleBaseline = y;
  y += 10;
  const text = lines
    .map((line) => {
      y += lineHeight;
      return `<text x="${mid}" y="${y - 4}" font-size="11" text-anchor="middle" fill="${c.muted}">${esc(line)}</text>`;
    })
    .join("");
  const hint = empty.hint
    ? `<text x="${mid}" y="${y + 16}" font-size="10.5" font-weight="600" text-anchor="middle" fill="${c.faint}">${esc(empty.hint)}</text>`
    : "";

  return `
<rect x="${mid - icon / 2 + 0.5}" y="${iconY + 0.5}" width="${icon - 1}" height="${icon - 1}" rx="12" fill="${c.card}" stroke="${c.border}"/>
<g transform="translate(${mid - 12} ${iconY + icon / 2 - 12})" fill="none" stroke="${c.muted}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[empty.icon]}</g>
<text x="${mid}" y="${titleBaseline}" font-size="14" font-weight="600" text-anchor="middle" fill="${c.text}">${esc(empty.title)}</text>
${text}
${hint}`;
}

/** Draws the whole monitor panel and returns it as a data URI for a Markdown image. */
export function monitorPanel(panel: MonitorPanel, dark: boolean): string {
  const c = dark ? DARK : LIGHT;
  const gutter = 12;
  const half = (PANEL_WIDTH - gutter) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_WIDTH * SCALE}" height="${PANEL_HEIGHT * SCALE}" viewBox="0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}">
<g font-family="${FONT}">
${header(panel, c)}
${toolbar(panel.traffic ? panel.windowMs >= 120_000 : undefined, c)}
${panel.traffic ? card(0, half, "download", c.down, "Download", panel.down, c) : ""}
${panel.traffic ? card(half + gutter, half, "upload", c.up, "Upload", panel.up, c) : ""}
${panel.traffic ? chart(panel, panel.traffic, c) : ""}
${panel.empty ? emptyState(panel.empty, c) : ""}
${details(panel.details, c)}
</g>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
