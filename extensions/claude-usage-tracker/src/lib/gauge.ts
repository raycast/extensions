import { Severity } from "./format";

export type Theme = "dark" | "light";

export interface GaugeSpec {
  /** 0–100, the value the arc fills to (remaining or used, as displayed). */
  percent: number;
  severity: Severity;
  /** Small caption under the number, e.g. `left` or `used`. */
  caption: string;
  title: string;
  subtitle?: string;
  /**
   * 0–100 on the same scale as `percent`: the share of the window's time (left or elapsed),
   * drawn as a thin inner ring so it can be compared with the quota arc at a glance.
   */
  time?: number;
  /** Text explaining the time ring, e.g. `83% of time left`. */
  timeLabel?: string;
}

const SEVERITY_HEX: Record<Severity, string> = {
  ok: "#30D158",
  warning: "#FFD60A",
  critical: "#FF9F0A",
  exhausted: "#FF453A",
};

const PALETTE: Record<Theme, { track: string; text: string; secondary: string; time: string }> = {
  dark: { track: "#3A3A3C", text: "#FFFFFF", secondary: "#98989F", time: "#D97757" },
  light: { track: "#E5E5EA", text: "#1C1C1E", secondary: "#6E6E73", time: "#C96442" },
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif";

/** Arc opens at the bottom: it starts at 150° and sweeps 240° clockwise through the top. */
const START_ANGLE = 150;
const SWEEP = 240;

export const CELL_WIDTH = 240;
const CELL_HEIGHT = 272;
/** Without the title line: fits the list detail pane above its metadata without scrolling. */
const COMPACT_CELL_HEIGHT = 214;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
}

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

const fmt = (n: number) => n.toFixed(2);

export function arcPath(cx: number, cy: number, r: number, fraction: number): string {
  const sweep = SWEEP * Math.min(1, Math.max(0, fraction));
  const [x1, y1] = polar(cx, cy, r, START_ANGLE);
  const [x2, y2] = polar(cx, cy, r, START_ANGLE + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${fmt(x1)} ${fmt(y1)} A ${r} ${r} 0 ${largeArc} 1 ${fmt(x2)} ${fmt(y2)}`;
}

/** One gauge as SVG elements, translated to `(x, 0)`. */
function gaugeCell(spec: GaugeSpec, x: number, theme: Theme, compact: boolean): string {
  const colors = PALETTE[theme];
  const cx = CELL_WIDTH / 2;
  const cy = 112;
  const r = 86;
  const stroke = 16;
  const percent = clamp(spec.percent);
  const parts = [
    `<g transform="translate(${x} 0)">`,
    `<path d="${arcPath(cx, cy, r, 1)}" fill="none" stroke="${colors.track}" stroke-width="${stroke}" stroke-linecap="round"/>`,
  ];
  if (percent > 0) {
    parts.push(
      `<path d="${arcPath(cx, cy, r, percent / 100)}" fill="none" stroke="${SEVERITY_HEX[spec.severity]}" stroke-width="${stroke}" stroke-linecap="round"/>`,
    );
  }
  if (spec.time !== undefined) {
    const inner = r - stroke / 2 - 9;
    parts.push(
      `<path d="${arcPath(cx, cy, inner, 1)}" fill="none" stroke="${colors.track}" stroke-width="4" stroke-linecap="round"/>`,
    );
    if (clamp(spec.time) > 0) {
      parts.push(
        `<path d="${arcPath(cx, cy, inner, clamp(spec.time) / 100)}" fill="none" stroke="${colors.time}" stroke-width="4" stroke-linecap="round"/>`,
      );
    }
  }
  parts.push(
    `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="700" fill="${colors.text}">${Math.round(percent)}%</text>`,
    `<text x="${cx}" y="${cy + 38}" text-anchor="middle" font-family="${FONT}" font-size="15" fill="${colors.secondary}">${escapeXml(spec.caption)}</text>`,
  );
  if (!compact) {
    parts.push(
      `<text x="${cx}" y="${cy + 100}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="${colors.text}">${escapeXml(spec.title)}</text>`,
    );
  }
  // The compact layout moves the lines under the arc up into the space the title leaves free.
  const lift = compact ? 52 : 0;
  if (spec.subtitle) {
    parts.push(
      `<text x="${cx}" y="${cy + 124 - lift}" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${colors.secondary}">${escapeXml(spec.subtitle)}</text>`,
    );
  }
  if (spec.timeLabel) {
    parts.push(
      `<text x="${cx}" y="${cy + 146 - lift}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${colors.secondary}"><tspan fill="${colors.time}">●</tspan> ${escapeXml(spec.timeLabel)}</text>`,
    );
  }
  parts.push("</g>");
  return parts.join("");
}

/** A row of gauges side by side in a single SVG. */
export function gaugeRowSvg(specs: GaugeSpec[], theme: Theme, compact = false): string {
  const width = Math.max(1, specs.length) * CELL_WIDTH;
  const height = compact ? COMPACT_CELL_HEIGHT : CELL_HEIGHT;
  const cells = specs.map((spec, index) => gaugeCell(spec, index * CELL_WIDTH, theme, compact)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${cells}</svg>`;
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** Markdown image for a gauge row; the alt text keeps the numbers readable without the image. */
export function gaugeMarkdown(specs: GaugeSpec[], theme: Theme, compact = false): string {
  const alt = specs.map((spec) => `${spec.title} ${Math.round(clamp(spec.percent))}% ${spec.caption}`).join(", ");
  return `![${escapeXml(alt)}](${svgDataUri(gaugeRowSvg(specs, theme, compact))})`;
}
