// Adapted from raycast-tesla-energy's src/utils/svgChart.ts (areaChart). Changes: the y-axis fits
// the data's range instead of starting at zero (a $70k balance moving by $3k would otherwise be a
// flat line), and an optional dashed step line shows net deposits, like Mercury's dashboard.

export interface BalanceChartOptions {
  width?: number;
  height?: number;
  color: string;
  labelColor: string;
  /** Dashed reference line, one value per point (net deposits). */
  baseline?: number[];
  xLabels?: string[];
  /**
   * A line of text above the plot. Raycast's markdown can't color text, so the returns figure is
   * drawn here, in green or red, instead of in the markdown.
   */
  caption?: Array<{ text: string; color?: string; bold?: boolean }>;
}

const X_LABEL_HEIGHT = 16;
const CAPTION_HEIGHT = 30;

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const point = points[i];
    const third = (point.x - previous.x) / 3;
    d += ` C ${previous.x + third},${previous.y} ${point.x - third},${point.y} ${point.x},${point.y}`;
  }
  return d;
}

function stepPath(points: Array<{ x: number; y: number }>): string {
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` H ${points[i].x} V ${points[i].y}`;
  return d;
}

/** Evenly spaced label positions, always including the first and last. */
function labelIndices(count: number, max: number): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}

export function balanceChart(values: number[], options: BalanceChartOptions): string {
  const { width = 640, color, labelColor, baseline, xLabels, caption } = options;
  const top = caption?.length ? CAPTION_HEIGHT : 0;
  const height = (options.height ?? 220) + top;
  const plotHeight = height - (xLabels?.length ? X_LABEL_HEIGHT : 0);
  const svg = (body: string) =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
    )}`;
  if (values.length < 2) return svg("");

  const all = [...values, ...(baseline ?? [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const padding = (max - min) * 0.12 || Math.max(max * 0.01, 1);
  const low = min - padding;
  const high = max + padding;
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (value: number) => top + 4 + (1 - (value - low) / (high - low)) * (plotHeight - top - 8);

  const line = smoothPath(values.map((value, i) => ({ x: x(i), y: y(value) })));
  const fill = `${line} L ${width},${plotHeight} L 0,${plotHeight} Z`;
  const dashed = baseline
    ? `<path d="${stepPath(baseline.map((value, i) => ({ x: x(i), y: y(value) })))}" fill="none" stroke="${escape(labelColor)}" stroke-width="1.2" stroke-dasharray="4,4"/>`
    : "";
  const labels = (xLabels ?? [])
    .map((label, i) => ({ label, i }))
    .filter(({ i }) => labelIndices(values.length, 5).includes(i))
    .map(({ label, i }) => {
      const anchor = i === 0 ? "start" : i === values.length - 1 ? "end" : "middle";
      return `<text x="${x(i)}" y="${height - 3}" font-size="11" fill="${escape(labelColor)}" text-anchor="${anchor}" font-family="-apple-system, sans-serif">${escape(label)}</text>`;
    })
    .join("");

  const captionText = caption?.length
    ? `<text x="0" y="20" font-size="17" font-family="-apple-system, sans-serif">${caption
        .map(
          (part) =>
            `<tspan fill="${escape(part.color ?? labelColor)}"${part.bold ? ' font-weight="600"' : ""}>${escape(part.text)}</tspan>`,
        )
        .join("")}</text>`
    : "";

  return svg(
    captionText +
      `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${escape(color)}" stop-opacity="0.28"/><stop offset="1" stop-color="${escape(color)}" stop-opacity="0.03"/></linearGradient></defs>` +
      `<path d="${fill}" fill="url(#fade)"/>` +
      dashed +
      `<path d="${line}" fill="none" stroke="${escape(color)}" stroke-width="2"/>` +
      labels,
  );
}
