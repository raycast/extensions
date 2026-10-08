interface BarChartRow {
  label: string;
  value: number;
}

interface ChartTheme {
  label: string;
  value: string;
  bar: string;
}

const THEMES: Record<"light" | "dark", ChartTheme> = {
  light: { label: "#444444", value: "#666666", bar: "#0066CC" },
  dark: { label: "#CCCCCC", value: "#999999", bar: "#4A9EFF" },
};

/**
 * Generates a horizontal bar chart as a base64-encoded SVG data URI.
 * Pass `appearance` from `environment.appearance` so colors match the active theme.
 */
export function horizontalBarChart(rows: BarChartRow[], appearance: "light" | "dark" = "light", width = 560): string {
  const { label: labelColor, value: valueColor, bar: barColor } = THEMES[appearance];

  const BAR_HEIGHT = 16;
  const ROW_GAP = 12;
  const LABEL_WIDTH = 80;
  const VALUE_WIDTH = 38;
  const BAR_AREA = width - LABEL_WIDTH - VALUE_WIDTH - 16;
  const ROW_HEIGHT = BAR_HEIGHT + ROW_GAP;
  const HEIGHT = rows.length * ROW_HEIGHT + ROW_GAP;
  const fontSize = 11;

  const maxValue = Math.max(...rows.map((r) => r.value), 1);

  const rowsSvg = rows
    .map((row, i) => {
      const y = ROW_GAP + i * ROW_HEIGHT;
      const barWidth = Math.round((row.value / maxValue) * BAR_AREA);
      const barX = LABEL_WIDTH;
      const valX = LABEL_WIDTH + BAR_AREA + 6;
      const textY = y + BAR_HEIGHT / 2 + fontSize * 0.38;

      return [
        `<text x="${LABEL_WIDTH - 6}" y="${textY}" text-anchor="end" font-size="${fontSize}" fill="${labelColor}" font-family="system-ui,sans-serif">${escSvg(row.label)}</text>`,
        `<rect x="${barX}" y="${y}" width="${Math.max(barWidth, 2)}" height="${BAR_HEIGHT}" rx="3" fill="${barColor}"/>`,
        `<text x="${valX}" y="${textY}" font-size="${fontSize}" fill="${valueColor}" font-family="system-ui,sans-serif">${row.value}</text>`,
      ].join("\n");
    })
    .join("\n");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}">`,
    rowsSvg,
    `</svg>`,
  ].join("\n");

  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}

function escSvg(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
