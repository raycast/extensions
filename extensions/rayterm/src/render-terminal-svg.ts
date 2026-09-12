import { TerminalCell, TerminalTab } from "./types";
import { RaytermTheme, getTheme, mapThemeColor } from "./themes";

const FONT_FAMILY = "MesloLGS NF, JetBrainsMono Nerd Font, SFMono-Regular, Menlo, monospace";
const BASE_FONT_SIZE = 14;
const BASE_CHAR_WIDTH = 9.1;
const BASE_LINE_HEIGHT = 18;
const BASE_COLUMNS = 60;
const BASE_VISIBLE_LINES = 23;
const COLUMN_SCALE_OFFSET = 0.08;
const PADDING_X = 12;
const PADDING_TOP = 22;
const PADDING_BOTTOM = 20;

export function buildTerminalSvgMarkdown(
  tab: TerminalTab,
  visibleLines: number,
  columns: number,
  scale = 1,
  showIndicator = false,
  theme: RaytermTheme = getTheme(undefined),
  scrollOffset = 0,
) {
  const svg = buildTerminalSvg(tab, visibleLines, columns, scale, showIndicator, theme, scrollOffset);
  const base64 = Buffer.from(svg, "utf8").toString("base64");
  return `![${escapeAlt(tab.title)}](data:image/svg+xml;base64,${base64})`;
}

export function getSvgTerminalSize(scale = 1, baseColumns = BASE_COLUMNS) {
  const lineHeight = BASE_LINE_HEIGHT * scale;
  const canvasHeight = Math.ceil(BASE_VISIBLE_LINES * BASE_LINE_HEIGHT + PADDING_TOP + PADDING_BOTTOM);
  return {
    columns: Math.max(1, Math.floor(baseColumns / Math.max(0.5, scale - COLUMN_SCALE_OFFSET))),
    rows: Math.max(1, Math.floor((canvasHeight - PADDING_TOP - PADDING_BOTTOM) / lineHeight)),
  };
}

function buildTerminalSvg(
  tab: TerminalTab,
  visibleLines: number,
  columns: number,
  scale: number,
  showIndicator: boolean,
  theme: RaytermTheme,
  scrollOffset: number,
) {
  const fontSize = BASE_FONT_SIZE * scale;
  const lineHeight = BASE_LINE_HEIGHT * scale;
  const canvasWidth = Math.ceil(BASE_COLUMNS * BASE_CHAR_WIDTH + PADDING_X * 2);
  const canvasHeight = Math.ceil(BASE_VISIBLE_LINES * BASE_LINE_HEIGHT + PADDING_TOP + PADDING_BOTTOM);
  const fittedColumns = Math.max(1, columns);
  const fittedVisibleLines = Math.max(1, visibleLines);
  const fittedCharWidth = (canvasWidth - PADDING_X * 2) / fittedColumns;
  const viewport = computeViewport(tab, fittedVisibleLines, fittedColumns, scrollOffset);
  const rows = viewport.rows;
  const cursor = visibleCursor(tab, viewport);
  const cursorRect = cursor
    ? `<rect x="${PADDING_X + cursor.column * fittedCharWidth}" y="${PADDING_TOP + cursor.row * lineHeight}" width="${fittedCharWidth}" height="${lineHeight}" fill="${theme.cursor}" opacity="0.42"/>`
    : "";
  const backgrounds = rows
    .map((row, rowIndex) => renderRowBackgrounds(row, rowIndex, fittedCharWidth, lineHeight, theme))
    .join("\n");
  const text = rows
    .map((row, rowIndex) => renderRowText(row, rowIndex, fittedCharWidth, lineHeight, fontSize, theme))
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
    `<rect width="100%" height="100%" rx="10" fill="${theme.background}"/>`,
    showIndicator
      ? `<text x="${canvasWidth - 8}" y="14" text-anchor="end" font-family="${escapeXml(FONT_FAMILY)}" font-size="10" fill="${theme.indicator}">${fittedColumns}x${fittedVisibleLines}</text>`
      : "",
    backgrounds,
    cursorRect,
    `<g font-family="${escapeXml(FONT_FAMILY)}" font-size="${fontSize}" xml:space="preserve">`,
    text,
    "</g>",
    "</svg>",
  ].join("\n");
}

function renderRowBackgrounds(
  row: TerminalCell[],
  rowIndex: number,
  charWidth: number,
  lineHeight: number,
  theme: RaytermTheme,
) {
  const y = PADDING_TOP + rowIndex * lineHeight;
  return row
    .map((cell, columnIndex) =>
      cell.bg
        ? `<rect x="${PADDING_X + columnIndex * charWidth}" y="${y}" width="${charWidth}" height="${lineHeight}" fill="${escapeXml(mapThemeColor(theme, cell.bg, theme.background))}"/>`
        : "",
    )
    .join("");
}

function renderRowText(
  row: TerminalCell[],
  rowIndex: number,
  charWidth: number,
  lineHeight: number,
  fontSize: number,
  theme: RaytermTheme,
) {
  const y = PADDING_TOP + rowIndex * lineHeight + textBaselineOffset(fontSize, lineHeight);
  return row
    .map((cell, columnIndex) => {
      if (!cell.ch || cell.ch === " ") return "";
      const x = PADDING_X + columnIndex * charWidth;
      const weight = cell.bold ? ' font-weight="700"' : "";
      const opacity = cell.dim ? ' opacity="0.68"' : "";
      const italic = cell.italic ? ' font-style="italic"' : "";
      return `<text x="${x}" y="${y}" fill="${escapeXml(mapThemeColor(theme, cell.fg, theme.foreground))}"${weight}${italic}${opacity}>${escapeXml(cell.ch)}</text>`;
    })
    .join("");
}

function textBaselineOffset(fontSize: number, lineHeight: number) {
  return Math.round((lineHeight - fontSize) / 2 + fontSize * 0.82);
}

interface Viewport {
  rows: TerminalCell[][];
  sourceRows: TerminalCell[][];
  visualRowCounts: number[];
  firstVisibleRow: number;
  columns: number;
  visibleLines: number;
}

// Computes the visible window without materializing the entire transcript.
// The per-source-row wrap counts are tallied in a single arithmetic pass
// (cheap even for thousands of lines), and only the rows inside the viewport
// are sliced into cell arrays. This keeps rendering O(visible) instead of
// O(total transcript) for large outputs.
function computeViewport(tab: TerminalTab, visibleLines: number, columns: number, scrollOffset: number): Viewport {
  const safeColumns = Math.max(1, columns);
  const safeVisibleLines = Math.max(1, visibleLines);
  const sourceRows = tab.cells?.length ? tab.cells : cellsFromText(tab.text);

  const visualRowCounts = new Array<number>(sourceRows.length);
  let totalVisualRows = 0;
  for (let index = 0; index < sourceRows.length; index += 1) {
    const length = sourceRows[index].length;
    const count = length ? Math.ceil(length / safeColumns) : 1;
    visualRowCounts[index] = count;
    totalVisualRows += count;
  }
  if (totalVisualRows === 0) totalVisualRows = 1;

  const maxScrollOffset = Math.max(0, totalVisualRows - safeVisibleLines);
  const safeScrollOffset = Math.max(0, Math.min(Math.floor(scrollOffset), maxScrollOffset));
  const end = totalVisualRows - safeScrollOffset;
  const start = Math.max(0, end - safeVisibleLines);

  const rows: TerminalCell[][] = [];
  let visualIndex = 0;
  for (let index = 0; index < sourceRows.length && visualIndex < end; index += 1) {
    const count = visualRowCounts[index];
    if (visualIndex + count <= start) {
      visualIndex += count;
      continue;
    }
    const row = sourceRows[index];
    for (let chunk = 0; chunk < count; chunk += 1) {
      const currentVisualRow = visualIndex + chunk;
      if (currentVisualRow >= start && currentVisualRow < end) {
        const from = chunk * safeColumns;
        rows.push(row.length ? row.slice(from, from + safeColumns) : []);
      }
    }
    visualIndex += count;
  }
  while (rows.length < safeVisibleLines) rows.push([]);

  return {
    rows,
    sourceRows,
    visualRowCounts,
    firstVisibleRow: start,
    columns: safeColumns,
    visibleLines: safeVisibleLines,
  };
}

function visibleCursor(tab: TerminalTab, viewport: Viewport) {
  if (typeof tab.cursorRow !== "number" || typeof tab.cursorCol !== "number") return undefined;

  const { sourceRows, visualRowCounts, firstVisibleRow, columns, visibleLines } = viewport;
  const logicalRow = Math.max(0, Math.min(tab.cursorRow, Math.max(0, sourceRows.length - 1)));
  const logicalCol = Math.max(0, tab.cursorCol);
  const currentRowLength = sourceRows[logicalRow]?.length ?? 0;
  const displayCol =
    logicalCol > 0 && logicalCol % columns === 0 && logicalCol >= currentRowLength ? logicalCol - 1 : logicalCol;

  let visualCursorRow = 0;
  for (let index = 0; index < logicalRow; index += 1) visualCursorRow += visualRowCounts[index] ?? 1;
  visualCursorRow += Math.floor(displayCol / columns);

  const row = visualCursorRow - firstVisibleRow;
  const column = displayCol % columns;

  if (row < 0 || row >= visibleLines) return undefined;
  return { row, column };
}

function cellsFromText(text: string) {
  return (text || "").split("\n").map((line) => Array.from(line).map((ch) => ({ ch })));
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAlt(value: string) {
  return value.replaceAll("[", "").replaceAll("]", "");
}
