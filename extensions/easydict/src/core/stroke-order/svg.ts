/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

const CELL_SIZE = 180;
const CELL_GAP = 12;
const OUTER_MARGIN = 8;
const GLYPH_TOP_INSET = 40;
const GLYPH_PADDING = 8;
const MAX_COLUMNS = 4;

export const MAX_STROKE_COUNT = 128;
export const MAX_RENDERED_STROKE_PATH_LENGTH = 5_000_000;

const colors = {
  background: "#FFFFFF",
  border: "#D1D5DB",
  completed: "#111827",
  current: "#E5484D",
  future: "#D1D5DB",
  grid: "#E5E7EB",
};

function escapeXmlAttribute(value: string): string {
  return value.replace(/[&"'<>]/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      case "<":
        return "&lt;";
      default:
        return "&gt;";
    }
  });
}

function renderPaths(indices: number[], fill: string, strokes: readonly string[]): string {
  return indices.map((index) => `<path d="${strokes[index]}" fill="${fill}" />`).join("");
}

function renderCell(step: number, strokes: readonly string[], x: number, y: number): string {
  const strokeCount = strokes.length;
  const future = Array.from({ length: strokeCount - step - 1 }, (_, index) => step + index + 1);
  const completed = Array.from({ length: step }, (_, index) => index);
  const glyphSize = CELL_SIZE - GLYPH_TOP_INSET - GLYPH_PADDING;
  const glyphScale = glyphSize / 1024;
  const glyphX = x + (CELL_SIZE - glyphSize) / 2;
  const glyphY = y + GLYPH_TOP_INSET;

  return `
    <g data-step="${step + 1}">
      <rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="12" fill="${colors.background}" stroke="${colors.border}" />
      <g stroke="${colors.grid}" stroke-dasharray="5 5" stroke-width="1">
        <line x1="${x}" y1="${y}" x2="${x + CELL_SIZE}" y2="${y + CELL_SIZE}" />
        <line x1="${x + CELL_SIZE}" y1="${y}" x2="${x}" y2="${y + CELL_SIZE}" />
        <line x1="${x + CELL_SIZE / 2}" y1="${y}" x2="${x + CELL_SIZE / 2}" y2="${y + CELL_SIZE}" />
        <line x1="${x}" y1="${y + CELL_SIZE / 2}" x2="${x + CELL_SIZE}" y2="${y + CELL_SIZE / 2}" />
      </g>
      <g transform="translate(${glyphX} ${glyphY}) scale(${glyphScale})">
        <g transform="translate(0 900) scale(1 -1)">
          ${renderPaths(future, colors.future, strokes)}
          ${renderPaths(completed, colors.completed, strokes)}
          <path d="${strokes[step]}" fill="${colors.current}" />
        </g>
      </g>
      <circle cx="${x + 22}" cy="${y + 22}" r="14" fill="${colors.current}" />
      <text x="${x + 22}" y="${y + 27}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">${step + 1}</text>
    </g>`;
}

/**
 * Create a static fan diagram: each tile adds one highlighted stroke.
 */
function renderStrokeOrderSvg(character: string, strokes: readonly string[]): { svg: string; width: number } {
  if (strokes.length === 0) throw new Error("Stroke order data must contain at least one stroke.");
  if (strokes.length > MAX_STROKE_COUNT) {
    throw new Error(`Stroke order data exceeds the ${MAX_STROKE_COUNT}-stroke safety limit.`);
  }

  const totalPathLength = strokes.reduce((total, path) => total + path.length, 0);
  if (totalPathLength * strokes.length > MAX_RENDERED_STROKE_PATH_LENGTH) {
    throw new Error("Stroke order data is too large to render safely.");
  }

  const columns = Math.min(MAX_COLUMNS, strokes.length);
  const rows = Math.ceil(strokes.length / columns);
  const width = OUTER_MARGIN * 2 + columns * CELL_SIZE + (columns - 1) * CELL_GAP;
  const height = OUTER_MARGIN * 2 + rows * CELL_SIZE + (rows - 1) * CELL_GAP;

  // Raycast's SVG renderer does not resolve <use href="#…"> references in
  // base64 images, so paths are deliberately inlined into every tile.
  const escapedStrokes = strokes.map(escapeXmlAttribute);
  const cells = escapedStrokes
    .map((_, step) => {
      const column = step % columns;
      const row = Math.floor(step / columns);
      const x = OUTER_MARGIN + column * (CELL_SIZE + CELL_GAP);
      const y = OUTER_MARGIN + row * (CELL_SIZE + CELL_GAP);
      return renderCell(step, escapedStrokes, x, y);
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Stroke order for ${escapeXmlAttribute(character)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${cells}
</svg>`;

  return { svg, width };
}

export function createStrokeOrderDiagram(
  character: string,
  strokes: readonly string[],
): { dataUri: string; width: number } {
  const { svg, width } = renderStrokeOrderSvg(character, strokes);

  return {
    dataUri: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    width,
  };
}
