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
  const rows = visibleRows(tab, fittedVisibleLines, fittedColumns, scrollOffset);
  const cursor = visibleCursor(tab, fittedVisibleLines, fittedColumns, scrollOffset);
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

function visibleRows(tab: TerminalTab, visibleLines: number, columns: number, scrollOffset: number) {
  const safeVisibleLines = Math.max(1, visibleLines);
  const safeColumns = Math.max(1, columns);
  const visualRows = toVisualRows(tab, safeColumns);
  const safeScrollOffset = Math.max(
    0,
    Math.min(Math.floor(scrollOffset), Math.max(0, visualRows.length - safeVisibleLines)),
  );
  const end = Math.max(0, visualRows.length - safeScrollOffset);
  const clipped = visualRows.slice(Math.max(0, end - safeVisibleLines), end);

  while (clipped.length < safeVisibleLines) clipped.push([]);
  return clipped.map((row) => row.slice(0, safeColumns));
}

function visibleCursor(tab: TerminalTab, visibleLines: number, columns: number, scrollOffset: number) {
  if (typeof tab.cursorRow !== "number" || typeof tab.cursorCol !== "number") return undefined;

  const safeColumns = Math.max(1, columns);
  const sourceRows = tab.cells?.length ? tab.cells : cellsFromText(tab.text);
  const logicalRow = Math.max(0, Math.min(tab.cursorRow, Math.max(0, sourceRows.length - 1)));
  const logicalCol = Math.max(0, tab.cursorCol);
  const currentRowLength = sourceRows[logicalRow]?.length ?? 0;
  const displayCol =
    logicalCol > 0 && logicalCol % safeColumns === 0 && logicalCol >= currentRowLength ? logicalCol - 1 : logicalCol;
  const visualCursorRow =
    sourceRows
      .slice(0, logicalRow)
      .reduce((count, row) => count + Math.max(1, Math.ceil(Math.max(1, row.length) / safeColumns)), 0) +
    Math.floor(displayCol / safeColumns);
  const totalVisualRows = toVisualRows(tab, safeColumns).length;
  const safeScrollOffset = Math.max(0, Math.min(Math.floor(scrollOffset), Math.max(0, totalVisualRows - visibleLines)));
  const firstVisibleRow = Math.max(0, totalVisualRows - visibleLines - safeScrollOffset);
  const row = visualCursorRow - firstVisibleRow;
  const column = displayCol % safeColumns;

  if (row < 0 || row >= visibleLines) return undefined;
  return { row, column };
}

function toVisualRows(tab: TerminalTab, columns: number) {
  const sourceRows = tab.cells?.length ? tab.cells : cellsFromText(tab.text);
  const visualRows: TerminalCell[][] = [];

  for (const row of sourceRows) {
    if (!row.length) {
      visualRows.push([]);
      continue;
    }

    for (let index = 0; index < row.length; index += columns) {
      visualRows.push(row.slice(index, index + columns));
    }
  }

  return visualRows.length ? visualRows : [[]];
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
