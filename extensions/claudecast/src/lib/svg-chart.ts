import { createHash } from "crypto";
import { writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Pure-string SVG bar chart renderer for embedding in Raycast Detail markdown
 * via `![](file://path?raycast-width=N)`. Caches by content hash so repeated
 * renders of the same data hit the same temp file.
 *
 * Raycast's markdown engine doesn't accept inline SVG or HTML, so writing to
 * disk and embedding by file path is the only way to show a real chart.
 */

export interface BarChartPoint {
  label: string;
  value: number;
}

export interface BarChartOptions {
  width?: number;
  height?: number;
  barColor?: string;
  axisColor?: string;
  labelColor?: string;
  valueFormatter?: (n: number) => string;
}

const DEFAULTS: Required<Omit<BarChartOptions, "valueFormatter">> = {
  width: 800,
  height: 360,
  // Raycast renders the embedded SVG image against whichever theme the user
  // is on; we have no theme hint at render time. Use white text painted with
  // a thin dark stroke (paint-order:stroke fill) so labels read against both
  // dark and light backgrounds. The bar color reads on both themes already.
  barColor: "#5B8DEF",
  axisColor: "#FFFFFF",
  labelColor: "#FFFFFF",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Render a vertical bar chart as an SVG string.
 */
export function renderBarChartSVG(
  points: BarChartPoint[],
  options?: BarChartOptions,
): string {
  const opts = { ...DEFAULTS, ...options };
  const fmt = options?.valueFormatter ?? ((n: number) => n.toString());

  const padTop = 36;
  const padBottom = 72;
  // Y labels are right-aligned at (padLeft - 10) and grow leftward; for
  // 3+ digit dollar values like "$100.50" at font-size 15 they need ~70px
  // of room before x=0 to keep the leading "$" visible.
  const padLeft = 90;
  const padRight = 24;

  const innerW = opts.width - padLeft - padRight;
  const innerH = opts.height - padTop - padBottom;

  const maxValue = Math.max(...points.map((p) => p.value), 0.0001);
  const barWidth = points.length > 0 ? (innerW / points.length) * 0.7 : 0;
  const barGap = points.length > 0 ? (innerW / points.length) * 0.3 : 0;

  // Label styling: pure white fill stays maximally bright on dark themes.
  // For light-theme readability, an SVG drop-shadow filter paints a soft
  // black halo OUTSIDE the glyph rather than thickening it (which is what an
  // SVG stroke would do, muting the white).
  const labelFont = 'font-family="-apple-system,BlinkMacSystemFont,sans-serif"';
  const labelStyle = `${labelFont} fill="${opts.labelColor}" filter="url(#textHalo)"`;

  const defs = `
  <defs>
    <filter id="textHalo" x="-20%" y="-50%" width="140%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#000" flood-opacity="0.95"/>
      <feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#000" flood-opacity="0.95"/>
    </filter>
  </defs>`;

  const yAxisLines: string[] = [];
  const yTickCount = 4;
  for (let i = 0; i <= yTickCount; i++) {
    const y = padTop + innerH - (innerH * i) / yTickCount;
    const tickValue = (maxValue * i) / yTickCount;
    yAxisLines.push(
      `<line x1="${padLeft}" y1="${y}" x2="${padLeft + innerW}" y2="${y}" stroke="${opts.axisColor}" stroke-opacity="0.25" stroke-width="1"/>`,
      `<text x="${padLeft - 10}" y="${y + 5}" text-anchor="end" font-size="15" font-weight="700" ${labelStyle}>${escapeXml(fmt(tickValue))}</text>`,
    );
  }

  const bars: string[] = points.map((p, i) => {
    const x = padLeft + (innerW / points.length) * i + barGap / 2;
    const h = (p.value / maxValue) * innerH;
    const y = padTop + innerH - h;
    const valueLabel =
      p.value > 0
        ? `<text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="14" font-weight="700" ${labelStyle}>${escapeXml(fmt(p.value))}</text>`
        : "";
    const xLabel = `<text x="${x + barWidth / 2}" y="${padTop + innerH + 22}" text-anchor="middle" font-size="15" font-weight="700" ${labelStyle}>${escapeXml(p.label)}</text>`;
    return [
      `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="3" fill="${opts.barColor}"/>`,
      valueLabel,
      xLabel,
    ].join("");
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.width} ${opts.height}" width="${opts.width}" height="${opts.height}">${defs}
  ${yAxisLines.join("\n  ")}
  ${bars.join("\n  ")}
</svg>`;
}

/**
 * Render the chart and write to a stable temp file keyed by content hash.
 * Returns the absolute file path, suitable for `file://` embedding.
 *
 * Same data produces the same path, so the file is written once per unique
 * dataset across the worker lifetime.
 */
export function renderBarChartToFile(
  points: BarChartPoint[],
  options?: BarChartOptions,
): string {
  const svg = renderBarChartSVG(points, options);
  const hash = createHash("sha1").update(svg).digest("hex").slice(0, 16);
  const filePath = join(tmpdir(), `claudecast-chart-${hash}.svg`);
  if (!existsSync(filePath)) {
    writeFileSync(filePath, svg, "utf-8");
  }
  return filePath;
}
