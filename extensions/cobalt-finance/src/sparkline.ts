import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { environment } from "@raycast/api";

interface SparklineOptions {
  width?: number;
  height?: number;
  /** CSS color for the line + area fill. Defaults: green if last >= first, red otherwise. */
  color?: string;
  /** Padding inside the SVG so dots aren't clipped at edges. */
  padding?: number;
}

/**
 * Render a smooth area-sparkline SVG for a series and write it to Raycast's
 * support path (deduped by content hash). Returns the absolute file path
 * suitable for embedding in markdown via `![alt](file:///path)`.
 *
 * Pure SVG — no third-party calls. Caller controls color so the same series
 * can render green for assets, red for liabilities.
 */
export function sparklineFile(
  values: number[],
  opts: SparklineOptions = {},
): string | null {
  if (values.length < 2) {
    return null;
  }
  const width = opts.width ?? 600;
  const height = opts.height ?? 140;
  const padding = opts.padding ?? 6;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const xStep = (width - padding * 2) / (values.length - 1);
  const points = values.map((v, i) => {
    const x = padding + i * xStep;
    const y = padding + (1 - (v - min) / span) * (height - padding * 2);
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${points.at(-1)?.[0].toFixed(2) ?? width - padding},${height - padding} L${padding},${height - padding} Z`;

  const last = values.at(-1) ?? 0;
  const head = values[0] ?? 0;
  const trending = last >= head;
  const color = opts.color ?? (trending ? "#22c55e" : "#ef4444");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${color}" stop-opacity="0" />
    </linearGradient>
  </defs>
  <path d="${areaPath}" fill="url(#g)" />
  <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
  <circle cx="${points.at(-1)?.[0].toFixed(2)}" cy="${points.at(-1)?.[1].toFixed(2)}" r="3.5" fill="${color}" />
</svg>`;

  const hash = createHash("sha1").update(svg).digest("hex").slice(0, 12);
  const path = join(environment.supportPath, `sparkline-${hash}.svg`);
  writeFileSync(path, svg);
  return path;
}
