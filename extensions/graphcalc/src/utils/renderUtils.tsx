import { DataPoint } from "../types";
import { GraphTheme } from "../lib/themes";

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

/** Characters XML 1.0 forbids even when escaped; a single one makes the whole SVG unparseable. */
// eslint-disable-next-line no-control-regex
const XML_ILLEGAL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

export function escapeXml(s: string): string {
  return s
    .replace(XML_ILLEGAL, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MAX_TITLE_CHARS = 48;
/** Vertical space reserved for the title row. */
const TITLE_HEIGHT = 56;
/** Card size in SVG units (the title row is added on top when present). */
export const CARD_WIDTH = 800;
const CARD_HEIGHT = 280;

export interface RenderOptions {
  /**
   * Rendered width in CSS pixels; height scales proportionally. Lets the same
   * drawing be exported at higher resolution than it is displayed.
   */
  displayWidth?: number;
  /** Title drawn inside the card (the expression), so it inherits the theme. */
  title?: string;
}

/**
 * Render the graph as a self-contained SVG card. The card paints its own
 * background so contrast never depends on the Raycast theme behind it; every
 * color comes from `theme` and must be a real CSS color (see lib/themes.ts).
 */
export function renderGraphToSVG(
  expression: string,
  dataSegments: DataPoint[][],
  xDomain: [number, number],
  yDomain: [number, number],
  theme: GraphTheme,
  options: RenderOptions = {},
) {
  const width = CARD_WIDTH;
  const titleHeight = options.title ? TITLE_HEIGHT : 0;
  const height = CARD_HEIGHT + titleHeight;
  const displayWidth = options.displayWidth ?? width;
  const displayHeight = Math.round((displayWidth * height) / width);
  const padding = { top: 24 + titleHeight, right: 32, bottom: 44, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;

  // Scale functions
  const scaleX = (x: number) =>
    padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const scaleY = (y: number) =>
    padding.top + plotHeight - ((y - yMin) / (yMax - yMin)) * plotHeight;

  try {
    // Background: solid fill or a top-to-bottom gradient, clipped to a rounded frame.
    const [bgTop, bgBottom] = Array.isArray(theme.background)
      ? theme.background
      : [theme.background, theme.background];
    const defs = `<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${bgTop}" />
        <stop offset="100%" stop-color="${bgBottom}" />
      </linearGradient>
      <clipPath id="frame"><rect x="0" y="0" width="${width}" height="${height}" rx="16" /></clipPath>
      <clipPath id="plot"><rect x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" /></clipPath>
    </defs>`;
    const background = `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)" />`;

    // Optional title, truncated to one line.
    const titleText = options.title
      ? options.title.length > MAX_TITLE_CHARS
        ? `${options.title.slice(0, MAX_TITLE_CHARS - 1)}…`
        : options.title
      : "";
    const title = titleText
      ? `<text x="${padding.left}" y="${titleHeight - 12}" fill="${theme.text}" font-family="${FONT}" font-size="24" font-weight="700">${escapeXml(titleText)}</text>`
      : "";

    // Create grid lines
    const gridLines: string[] = [];
    const numGridLines = 5;

    // Vertical grid lines
    for (let i = 0; i <= numGridLines; i++) {
      const x = padding.left + (i / numGridLines) * plotWidth;
      gridLines.push(
        `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="${theme.grid}" stroke-dasharray="3,3" />`,
      );
    }

    // Horizontal grid lines
    for (let i = 0; i <= numGridLines; i++) {
      const y = padding.top + (i / numGridLines) * plotHeight;
      gridLines.push(
        `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${theme.grid}" stroke-dasharray="3,3" />`,
      );
    }

    // Create axis labels
    const xLabels: string[] = [];
    const yLabels: string[] = [];

    for (let i = 0; i <= numGridLines; i++) {
      const xVal = xMin + (i / numGridLines) * (xMax - xMin);
      const xPos = padding.left + (i / numGridLines) * plotWidth;
      xLabels.push(
        `<text x="${xPos}" y="${height - padding.bottom + 20}" fill="${theme.text}" font-family="${FONT}" font-size="12" text-anchor="middle">${xVal.toFixed(1)}</text>`,
      );

      const yVal = yMin + (i / numGridLines) * (yMax - yMin);
      const yPos = padding.top + plotHeight - (i / numGridLines) * plotHeight;
      yLabels.push(
        `<text x="${padding.left - 10}" y="${yPos + 4}" fill="${theme.text}" font-family="${FONT}" font-size="12" text-anchor="end">${yVal.toFixed(1)}</text>`,
      );
    }

    // Create path for each segment
    const paths = dataSegments
      .map((segment) => {
        if (segment.length === 0) return "";

        const pathData = segment
          .map((point, index) => {
            // Two decimals in an 800-unit card is sub-pixel even at 2x export
            // and roughly halves the SVG (which is embedded base64 in markdown).
            const x = scaleX(point.x).toFixed(2);
            const y = scaleY(point.y).toFixed(2);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");

        return `<path d="${pathData}" stroke="${theme.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" fill="none" />`;
      })
      .filter((p) => p !== "");

    // Axes
    const xAxis = `<line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="${theme.axis}" stroke-width="2" />`;
    const yAxis = `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="${theme.axis}" stroke-width="2" />`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${displayWidth}" height="${displayHeight}" viewBox="0 0 ${width} ${height}">
      ${defs}
      <g clip-path="url(#frame)">
      ${background}
      ${title}
      ${gridLines.join("\n      ")}
      ${xAxis}
      ${yAxis}
      ${xLabels.join("\n      ")}
      ${yLabels.join("\n      ")}
      <g clip-path="url(#plot)">
      ${paths.join("\n      ")}
      </g>
      </g>
    </svg>`;
  } catch (error) {
    console.error("SVG rendering error:", error);
    return "";
  }
}
