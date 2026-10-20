const HOURS_IN_DAY = 24;

export type Appearance = "light" | "dark";

interface Palette {
  bar: string;
  peak: string;
  /** Idle time: readable against the ground without competing with active time. */
  idle: string;
  empty: string;
  axis: string;
  label: string;
}

/**
 * Two flat palettes rather than CSS variables: the SVG is rasterised by the host,
 * so it cannot react to the theme after the fact. `environment.appearance` picks.
 */
const PALETTES: Record<Appearance, Palette> = {
  dark: { bar: "#4C8DFF", peak: "#7FB0FF", idle: "#5B5B62", empty: "#2C2C2E", axis: "#3A3A3C", label: "#8E8E93" },
  light: { bar: "#2563EB", peak: "#1D4ED8", idle: "#B9BAC0", empty: "#E5E5EA", axis: "#D1D1D6", label: "#6B7280" },
};

export interface ChartOptions {
  appearance: Appearance;
  width?: number;
  height?: number;
  /**
   * Highest value the axis may reach, in seconds.
   *
   * An hour bucket cannot hold more than an hour, so offering a 2h gridline
   * invites the reader to believe otherwise and wastes half the plot. Buckets can
   * still creep a little past the hour, because a slice is filed under the hour it
   * began in, so bars are clamped to the ceiling rather than the ceiling raised.
   */
  maxCeiling?: number;
}

/** Hours named on the axis. Every hour would be unreadable at this width. */
const AXIS_HOURS = [0, 6, 12, 18];

/** `12 AM`, `6 AM`: the roomier axis of the day chart can afford the full form. */
function fullAxisLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function axisLabel(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

/** Escape the few characters that would break out of an SVG text node. */
function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * A bar per hour of the day, scaled to the busiest.
 *
 * Drawn rather than typed out. Block characters in a code fence were the obvious
 * approach and did not survive contact with the renderer: Raycast's monospace
 * fall back is not uniform across block and punctuation glyphs, so hand-aligned
 * columns drift. An image has no such problem.
 */
export function hourlyChartSvg(hours: number[], opts: ChartOptions): string {
  const width = opts.width ?? 320;
  const height = opts.height ?? 110;
  const palette = PALETTES[opts.appearance];

  const labelRoom = 14;
  // Headroom so the tallest bar does not sit flush against the top edge.
  const headroom = 6;
  const plot = height - labelRoom - 1;
  const slot = width / HOURS_IN_DAY;
  const barWidth = Math.max(3, slot - 3);

  let peak = 0;
  let peakHour = -1;
  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const value = hours[hour] ?? 0;
    if (Number.isFinite(value) && value > peak) {
      peak = value;
      peakHour = hour;
    }
  }

  const parts: string[] = [];
  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const value = Math.max(0, hours[hour] ?? 0);
    const x = (hour * slot + (slot - barWidth) / 2).toFixed(1);

    // An empty hour draws nothing: a stub on every empty slot reads as a dashed
    // baseline rather than as absence.
    if (peak <= 0 || value <= 0) continue;

    // Anything recorded gets at least a visible sliver.
    const barHeight = Math.max(3, Math.round((value / peak) * (plot - headroom)));
    const fill = hour === peakHour ? palette.peak : palette.bar;
    parts.push(
      `<rect x="${x}" y="${plot - barHeight}" width="${barWidth.toFixed(1)}" height="${barHeight}" rx="1.5" fill="${fill}"/>`,
    );
  }

  parts.push(
    `<line x1="0" y1="${plot + 0.5}" x2="${width}" y2="${plot + 0.5}" stroke="${palette.axis}" stroke-width="1"/>`,
  );

  for (const hour of AXIS_HOURS) {
    // The first label would overhang the left edge if it were centred on its slot.
    const anchor = hour === 0 ? "start" : "middle";
    const x = hour === 0 ? 0 : hour * slot + slot / 2;
    parts.push(
      `<text x="${x.toFixed(1)}" y="${height - 2}" fill="${palette.label}" font-family="-apple-system,system-ui,sans-serif" font-size="9" text-anchor="${anchor}">${escapeText(axisLabel(hour))}</text>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
}

/**
 * A chart as ready-to-render markdown.
 *
 * Composed here rather than at the call site: a bare data URI handed to a
 * markdown prop renders as a wall of base64 text, and nothing about the type
 * signature would have stopped you.
 */
export function dayChartMarkdown(data: DayChartData, opts: ChartOptions): string {
  return `![](${svgDataUri(dayChartSvg(data, opts))})`;
}

/**
 * Base64 rather than percent-encoding: the markup is full of `#` and quotes, and
 * base64 sidesteps every escaping question in one step.
 */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export interface DayChartData {
  /** 24 buckets of active seconds. */
  active: number[];
  /** 24 buckets of idle seconds, stacked above the active portion. */
  idle: number[];
  /** Hour to pick out, if any. */
  highlight?: number | null;
}

/**
 * Gridline steps, smallest first, in seconds.
 *
 * A chart whose top is the exact peak has no readable scale, and one that always
 * tops out at an hour flattens a quiet day into nothing. Snapping to a round
 * duration gives an axis people can actually read a value off.
 */
const AXIS_STEPS = [300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400];

function niceCeiling(peak: number): number {
  for (const step of AXIS_STEPS) {
    if (peak <= step) return step;
  }
  // A multi-day range can exceed a day of stacked time in one bucket.
  return Math.ceil(peak / 86400) * 86400;
}

/** `30m`, `1h`, `6h`: short enough for an axis gutter. */
function axisDuration(seconds: number): string {
  if (seconds <= 0) return "0";
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  return `${Math.round(seconds / 60)}m`;
}

/**
 * The whole day as stacked bars: active time with idle above it.
 *
 * Two series rather than per-application colours. Stacking by app would need a
 * palette of arbitrary size and a legend nobody can hold in their head, and the
 * app breakdown already sits beside this in the metadata panel.
 */
export function dayChartSvg(data: DayChartData, opts: ChartOptions): string {
  const width = opts.width ?? 380;
  const height = opts.height ?? 150;
  const palette = PALETTES[opts.appearance];

  const gutter = 30;
  const labelRoom = 14;
  const legendRoom = 16;
  // Room for the topmost gridline's label, which would otherwise clip at y=0.
  const topPad = 7;
  const plotWidth = width - gutter;
  const plotBottom = height - labelRoom - legendRoom;
  const plotHeight = plotBottom - topPad;
  const slot = plotWidth / HOURS_IN_DAY;
  const barWidth = Math.max(3, slot - 3);

  let peak = 0;
  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const total = Math.max(0, data.active[hour] ?? 0) + Math.max(0, data.idle[hour] ?? 0);
    if (total > peak) peak = total;
  }
  const ceiling = Math.min(niceCeiling(peak), opts.maxCeiling ?? 3600);
  const plotTop = plotBottom - plotHeight;
  const scale = (seconds: number) => Math.min(plotHeight, (seconds / ceiling) * plotHeight);

  const parts: string[] = [];

  // Gridlines first, so bars sit over them.
  for (const fraction of [0, 0.5, 1]) {
    const y = plotBottom - fraction * plotHeight;
    parts.push(
      `<line x1="0" y1="${y.toFixed(1)}" x2="${plotWidth}" y2="${y.toFixed(1)}" stroke="${palette.axis}" stroke-width="1"/>`,
    );
    parts.push(
      `<text x="${(plotWidth + 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="${palette.label}" font-family="-apple-system,system-ui,sans-serif" font-size="9">${escapeText(axisDuration(fraction * ceiling))}</text>`,
    );
  }

  for (let hour = 0; hour < HOURS_IN_DAY; hour += 1) {
    const active = Math.max(0, data.active[hour] ?? 0);
    const idle = Math.max(0, data.idle[hour] ?? 0);
    if (active <= 0 && idle <= 0) continue;

    const x = hour * slot + (slot - barWidth) / 2;
    const dim = data.highlight != null && data.highlight !== hour;
    let cursor = plotBottom;

    for (const [seconds, colour] of [
      [active, dim ? palette.bar : palette.peak],
      [idle, palette.idle],
    ] as const) {
      if (seconds <= 0) continue;
      // Never let a stack climb out of the plot, however far past the hour it ran.
      const room = cursor - plotTop;
      if (room <= 0) break;
      const barHeight = Math.max(2, Math.min(scale(seconds), room));
      cursor -= barHeight;
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${cursor.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="1.5" fill="${colour}" opacity="${dim ? "0.55" : "1"}"/>`,
      );
    }
  }

  for (const hour of AXIS_HOURS) {
    const anchor = hour === 0 ? "start" : "middle";
    const x = hour === 0 ? 0 : hour * slot + slot / 2;
    parts.push(
      `<text x="${x.toFixed(1)}" y="${(plotBottom + 12).toFixed(1)}" fill="${palette.label}" font-family="-apple-system,system-ui,sans-serif" font-size="9" text-anchor="${anchor}">${escapeText(fullAxisLabel(hour))}</text>`,
    );
  }

  const legendY = height - 4;
  let legendX = 0;
  for (const [label, colour] of [
    ["Active", palette.peak],
    ["Idle", palette.idle],
  ] as const) {
    parts.push(`<rect x="${legendX}" y="${legendY - 7}" width="7" height="7" rx="1.5" fill="${colour}"/>`);
    parts.push(
      `<text x="${legendX + 11}" y="${legendY}" fill="${palette.label}" font-family="-apple-system,system-ui,sans-serif" font-size="9">${escapeText(label)}</text>`,
    );
    legendX += 11 + label.length * 5.4 + 14;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
}
