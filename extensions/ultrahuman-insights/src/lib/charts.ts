import { Color } from "@raycast/api";

export interface ChartOpts {
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDots?: boolean;
  labels?: string[];
}

// ---------------------------------------------------------------------------
// Color helper
// ---------------------------------------------------------------------------

/** Map a Raycast Color enum value to a hex string for SVG use. */
export function colorToHex(c: Color | string): string {
  // If already a hex string, pass through
  if (typeof c === "string" && c.startsWith("#")) return c;
  switch (c) {
    case Color.Green:
      return "#5BC8AF";
    case Color.Yellow:
      return "#E8B339";
    case Color.Red:
      return "#E5484D";
    case Color.Blue:
      return "#0EA5E9";
    case Color.Purple:
      return "#9747FF";
    case Color.Orange:
      return "#F97316";
    default:
      return "#8E8E93";
  }
}

// ---------------------------------------------------------------------------
// Data URI helper  (stateless — no file I/O required)
// ---------------------------------------------------------------------------

/** Encode an SVG string as a base64 data URI for inline markdown embedding.
 * Raycast's markdown renderer accepts `data:image/svg+xml;base64,...` in
 * `![alt](…)` image tags, and unlike `file://` URLs it requires no disk writes
 * and is unaffected by spaces or trust-policy restrictions on the path. */
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

// ---------------------------------------------------------------------------
// Line chart
// ---------------------------------------------------------------------------

/**
 * Generate a line chart SVG and return a markdown image string using an
 * inline base64 data URI.
 *
 * Returns `![chart](data:image/svg+xml;base64,...)`.
 */
export function lineChart(
  values: Array<number | undefined | null>,
  opts?: ChartOpts,
): string {
  const width = opts?.width ?? 600;
  const height = opts?.height ?? 120;
  const color = opts?.color ?? "#5BC8AF";
  const fillOpacity = opts?.fillOpacity ?? 0.15;
  const showDots = opts?.showDots ?? true;
  const labels = opts?.labels;

  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 10;
  const PAD_B = labels && labels.length > 0 ? 28 : 10;

  const chartW = width - PAD_L - PAD_R;
  const chartH = height - PAD_T - PAD_B;

  const present = values.filter((v): v is number => v != null && isFinite(v));
  if (present.length === 0) return "";

  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;

  const n = values.length;

  function xPos(i: number): number {
    if (n <= 1) return PAD_L + chartW / 2;
    return PAD_L + (i / (n - 1)) * chartW;
  }

  function yPos(v: number): number {
    return PAD_T + chartH - ((v - min) / range) * chartH;
  }

  // Build polyline path segments, breaking on null/undefined
  const pathParts: string[] = [];
  let penDown = false;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v == null || !isFinite(v)) {
      penDown = false;
      continue;
    }
    const x = xPos(i).toFixed(1);
    const y = yPos(v).toFixed(1);
    if (!penDown) {
      pathParts.push(`M ${x},${y}`);
      penDown = true;
    } else {
      pathParts.push(`L ${x},${y}`);
    }
  }
  const linePath = pathParts.join(" ");

  // Build fill area path (close back along the bottom)
  const fillParts: string[] = [];
  let firstX: number | null = null;
  let lastX: number | null = null;
  let fillPenDown = false;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v == null || !isFinite(v)) {
      fillPenDown = false;
      continue;
    }
    const x = xPos(i);
    const y = yPos(v);
    if (!fillPenDown) {
      fillParts.push(`M ${x.toFixed(1)},${(PAD_T + chartH).toFixed(1)}`);
      fillParts.push(`L ${x.toFixed(1)},${y.toFixed(1)}`);
      firstX = x;
      lastX = x;
      fillPenDown = true;
    } else {
      fillParts.push(`L ${x.toFixed(1)},${y.toFixed(1)}`);
      lastX = x;
    }
  }
  if (lastX != null) {
    fillParts.push(`L ${lastX.toFixed(1)},${(PAD_T + chartH).toFixed(1)}`);
    if (firstX != null) {
      fillParts.push(`L ${firstX.toFixed(1)},${(PAD_T + chartH).toFixed(1)}`);
    }
    fillParts.push("Z");
  }
  const fillPath = fillParts.join(" ");

  // Dots
  const dots: string[] = [];
  if (showDots) {
    for (let i = 0; i < n; i++) {
      const v = values[i];
      if (v == null || !isFinite(v)) continue;
      const x = xPos(i).toFixed(1);
      const y = yPos(v).toFixed(1);
      dots.push(`<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`);
    }
  }

  // Labels
  const labelElements: string[] = [];
  if (labels && labels.length > 0) {
    for (let i = 0; i < Math.min(labels.length, n); i++) {
      const x = xPos(i).toFixed(1);
      const y = (PAD_T + chartH + 16).toFixed(1);
      labelElements.push(
        `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" font-family="system-ui,-apple-system,sans-serif" fill="#8E8E93">${escapeXml(labels[i])}</text>`,
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <path d="${fillPath}" fill="${color}" fill-opacity="${fillOpacity}" />
  <path d="${linePath}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
  ${dots.join("\n  ")}
  ${labelElements.join("\n  ")}
</svg>`;

  return `![chart](${svgToDataUri(svg)})`;
}

// ---------------------------------------------------------------------------
// Stages bar
// ---------------------------------------------------------------------------

/**
 * Generate a horizontal stacked bar chart for sleep stages and return a
 * markdown image string using an inline base64 data URI.
 */
export function stagesBar(
  stages: { deep: number; rem: number; light: number },
  opts?: ChartOpts,
): string {
  const width = opts?.width ?? 600;
  const barHeight = 28;
  const legendHeight = 20;
  const totalHeight = barHeight + legendHeight + 8;

  const total = (stages.deep ?? 0) + (stages.rem ?? 0) + (stages.light ?? 0);
  if (total === 0) return "_No stage data available_";

  const deepColor = "#2D5A8C";
  const remColor = "#9747FF";
  const lightColor = "#5BC8AF";

  const deepW = (stages.deep / total) * width;
  const remW = (stages.rem / total) * width;
  const lightW = (stages.light / total) * width;

  const r = 6; // corner radius

  // Build the three segments as a single rounded-rectangle path group
  // Deep: left-rounded left segment
  // Light: right-rounded right segment
  // REM: middle segment (no rounding)
  const deepX = 0;
  const remX = deepW;
  const lightX = deepW + remW;

  function formatDur(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  // Segments as rectangles with selective rounding using clipPath tricks or
  // just plain rects with rx only on the outer segments
  const segments: string[] = [];

  if (deepW > 0) {
    // Left segment: round left corners only
    segments.push(
      `<path d="M ${(deepX + r).toFixed(1)},0 L ${(deepX + deepW).toFixed(1)},0 L ${(deepX + deepW).toFixed(1)},${barHeight} L ${(deepX + r).toFixed(1)},${barHeight} Q ${deepX.toFixed(1)},${barHeight} ${deepX.toFixed(1)},${(barHeight - r).toFixed(1)} L ${deepX.toFixed(1)},${r.toFixed(1)} Q ${deepX.toFixed(1)},0 ${(deepX + r).toFixed(1)},0 Z" fill="${deepColor}" />`,
    );
  }
  if (remW > 0) {
    // Middle segment: no rounding
    segments.push(
      `<rect x="${remX.toFixed(1)}" y="0" width="${remW.toFixed(1)}" height="${barHeight}" fill="${remColor}" />`,
    );
  }
  if (lightW > 0) {
    // Right segment: round right corners only
    const lx = lightX;
    const lw = lightW;
    segments.push(
      `<path d="M ${lx.toFixed(1)},0 L ${(lx + lw - r).toFixed(1)},0 Q ${(lx + lw).toFixed(1)},0 ${(lx + lw).toFixed(1)},${r.toFixed(1)} L ${(lx + lw).toFixed(1)},${(barHeight - r).toFixed(1)} Q ${(lx + lw).toFixed(1)},${barHeight} ${(lx + lw - r).toFixed(1)},${barHeight} L ${lx.toFixed(1)},${barHeight} Z" fill="${lightColor}" />`,
    );
  }

  // Legend
  const legendY = barHeight + 14;
  const swatchSize = 8;
  const legendItems = [
    { color: deepColor, label: `Deep  ${formatDur(stages.deep)}` },
    { color: remColor, label: `REM  ${formatDur(stages.rem)}` },
    { color: lightColor, label: `Light  ${formatDur(stages.light)}` },
  ];

  // Estimate text widths and lay out legend centred
  // Simple approach: fixed spacing
  const itemSpacing = 160;
  const totalLegendW = legendItems.length * itemSpacing - 40;
  const legendStartX = (width - totalLegendW) / 2;

  const legendEls: string[] = [];
  legendItems.forEach((item, i) => {
    const lx = legendStartX + i * itemSpacing;
    legendEls.push(
      `<rect x="${lx.toFixed(1)}" y="${(legendY - swatchSize).toFixed(1)}" width="${swatchSize}" height="${swatchSize}" rx="2" fill="${item.color}" />`,
    );
    legendEls.push(
      `<text x="${(lx + swatchSize + 5).toFixed(1)}" y="${legendY.toFixed(1)}" font-size="10" font-family="system-ui,-apple-system,sans-serif" fill="#8E8E93">${escapeXml(item.label)}</text>`,
    );
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}">
  ${segments.join("\n  ")}
  ${legendEls.join("\n  ")}
</svg>`;

  return `![stages](${svgToDataUri(svg)})`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
