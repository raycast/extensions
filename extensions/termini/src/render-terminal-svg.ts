import { TerminalCell, TerminalTab } from "./types";
import { TerminiTheme, mapThemeColor } from "./themes";

const FONT_FAMILY = "MesloLGS NF, JetBrainsMono Nerd Font, SFMono-Regular, Menlo, monospace";
const BASE_FONT_SIZE = 14;
const BASE_CHAR_WIDTH = 9.1;
const BASE_LINE_HEIGHT = 18;
const BASE_COLUMNS = 90;
const COLUMN_SCALE_OFFSET = 0.08;
const PADDING_X = 16;
const HEADER_HEIGHT = 30;
const PADDING_TOP = HEADER_HEIGHT + 12;
const PADDING_BOTTOM = 18;
// 16:9 so the frame fills a full-width 16:9 Grid cell edge to edge.
const CANVAS_WIDTH = Math.ceil(BASE_COLUMNS * BASE_CHAR_WIDTH + PADDING_X * 2);
const CANVAS_HEIGHT = Math.round((CANVAS_WIDTH * 9) / 16);
// The 16:9 cell runs under Raycast's action bar, so the terminal card only uses the top
// part (2:1, what fits between the search bar and the action bar); the rest is transparent.
const CARD_HEIGHT = Math.round(CANVAS_WIDTH / 2);
const TAB_MAX_WIDTH = 168;
const STATUS_LABEL_WIDTH = 84;
const TAB_FONT_CHAR_WIDTH = 7.3;

export function getSvgTerminalSize(scale = 1, baseColumns = BASE_COLUMNS) {
  const lineHeight = BASE_LINE_HEIGHT * scale;
  const canvasHeight = CARD_HEIGHT;
  return {
    columns: Math.max(1, Math.floor(baseColumns / Math.max(0.5, scale - COLUMN_SCALE_OFFSET))),
    rows: Math.max(1, Math.floor((canvasHeight - PADDING_TOP - PADDING_BOTTOM) / lineHeight)),
  };
}

export function buildTerminalSvg(
  tab: TerminalTab,
  visibleLines: number,
  columns: number,
  scale: number,
  showIndicator: boolean,
  theme: TerminiTheme,
  scrollOffset: number,
  allTabs: TerminalTab[],
) {
  const fontSize = BASE_FONT_SIZE * scale;
  const lineHeight = BASE_LINE_HEIGHT * scale;
  const canvasWidth = CANVAS_WIDTH;
  const canvasHeight = CANVAS_HEIGHT;
  const fittedColumns = Math.max(1, columns);
  const fittedVisibleLines = Math.max(1, visibleLines);
  const fittedCharWidth = (canvasWidth - PADDING_X * 2) / fittedColumns;
  const viewport = computeViewport(tab, fittedVisibleLines, fittedColumns, scrollOffset);
  const rows = viewport.rows;
  const cursor = visibleCursor(tab, viewport);
  // Thin accent bar over a faint cell glow: reads as a caret but stays visible in TUIs.
  const cursorRect = cursor
    ? [
        `<rect x="${PADDING_X + cursor.column * fittedCharWidth}" y="${PADDING_TOP + cursor.row * lineHeight}" width="${fittedCharWidth}" height="${lineHeight}" rx="2" fill="${theme.cursor}" opacity="0.14"/>`,
        `<rect x="${PADDING_X + cursor.column * fittedCharWidth}" y="${PADDING_TOP + cursor.row * lineHeight + 1}" width="${Math.max(2, 2 * scale)}" height="${lineHeight - 2}" rx="1" fill="${theme.cursor}"/>`,
      ].join("")
    : "";
  const backgrounds = rows
    .map((row, rowIndex) => renderRowBackgrounds(row, rowIndex, fittedCharWidth, lineHeight, theme))
    .join("\n");
  const text = rows
    .map((row, rowIndex) => renderRowText(row, rowIndex, fittedCharWidth, lineHeight, fontSize, theme))
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${theme.background}"/><stop offset="1" stop-color="${theme.backgroundTo ?? theme.background}"/></linearGradient></defs>`,
    `<rect x="0.5" y="0.5" width="${canvasWidth - 1}" height="${CARD_HEIGHT - 1}" rx="14" fill="url(#bg)" stroke="${theme.cursor}" stroke-opacity="0.22"/>`,
    renderTabStrip(
      allTabs,
      tab,
      canvasWidth,
      theme,
      showIndicator ? `${fittedColumns}×${fittedVisibleLines}` : undefined,
    ),
    backgrounds,
    cursorRect,
    `<g font-family="${escapeXml(FONT_FAMILY)}" font-size="${fontSize}" xml:space="preserve">`,
    text,
    "</g>",
    "</svg>",
  ].join("\n");
}

// Terminal-app style tab strip: every tab, numbered for ⌘1–⌘9, the active one lifted and underlined.
function renderTabStrip(
  tabs: TerminalTab[],
  active: TerminalTab,
  canvasWidth: number,
  theme: TerminiTheme,
  sizeLabel?: string,
) {
  const font = `font-family="${escapeXml(FONT_FAMILY)}"`;
  const usable = canvasWidth - PADDING_X * 2 - STATUS_LABEL_WIDTH;
  const tabWidth = Math.min(TAB_MAX_WIDTH, usable / Math.max(1, tabs.length));
  const textY = HEADER_HEIGHT / 2 + 6;
  const parts = tabs.map((item, index) => {
    const x = PADDING_X - 6 + index * tabWidth;
    const isActive = item.id === active.id;
    const running = item.status === "running";
    const dot = running ? (theme.ansi[6] ?? theme.cursor) : isActive ? theme.cursor : theme.indicator;
    const maxChars = Math.max(1, Math.floor((tabWidth - 38) / TAB_FONT_CHAR_WIDTH));
    const title = item.title.length > maxChars ? `${item.title.slice(0, Math.max(1, maxChars - 1))}…` : item.title;
    return [
      isActive
        ? `<rect x="${x}" y="6" width="${tabWidth - 4}" height="${HEADER_HEIGHT - 2}" rx="7" fill="${theme.cursor}" fill-opacity="0.16"/>` +
          `<rect x="${x + 8}" y="${HEADER_HEIGHT + 1}" width="${tabWidth - 20}" height="2" rx="1" fill="${theme.cursor}"/>`
        : index > 0 && tabs[index - 1].id !== active.id
          ? `<line x1="${x - 2}" y1="12" x2="${x - 2}" y2="${HEADER_HEIGHT - 2}" stroke="${theme.indicator}" stroke-opacity="0.35"/>`
          : "",
      `<text x="${x + 9}" y="${textY}" ${font} font-size="10" fill="${theme.indicator}">${index < 9 ? index + 1 : ""}</text>`,
      `<circle cx="${x + 23}" cy="${textY - 4}" r="3.5" fill="${dot}"/>`,
      `<text x="${x + 31}" y="${textY}" ${font} font-size="12" font-weight="${isActive ? 600 : 400}" fill="${theme.foreground}" opacity="${isActive ? 0.95 : 0.55}" xml:space="preserve">${escapeXml(title)}</text>`,
    ].join("");
  });
  const running = active.status === "running";
  const status =
    sizeLabel ??
    `${active.truncated ? "scrollback truncated · " : ""}${active.attached ? "in terminal" : running ? "running" : "idle"}`;
  parts.push(
    `<text x="${canvasWidth - PADDING_X}" y="${textY}" text-anchor="end" ${font} font-size="11" fill="${running ? (theme.ansi[6] ?? theme.cursor) : theme.indicator}">${escapeXml(status)}</text>`,
    `<line x1="${PADDING_X}" y1="${HEADER_HEIGHT + 2}" x2="${canvasWidth - PADDING_X}" y2="${HEADER_HEIGHT + 2}" stroke="${theme.indicator}" stroke-opacity="0.35"/>`,
  );
  return parts.join("");
}

function renderRowBackgrounds(
  row: TerminalCell[],
  rowIndex: number,
  charWidth: number,
  lineHeight: number,
  theme: TerminiTheme,
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
  theme: TerminiTheme,
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
