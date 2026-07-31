import { environment } from "@raycast/api";
import { InteractiveSnapshot, InteractiveTerminalLine, InteractiveTerminalSpan } from "./interactive";
import { shortcutLabel } from "./shortcuts";

interface TerminalPreviewOptions {
  title: string;
  scale?: number;
  scrollOffset?: number;
  fullWidth?: boolean;
}

const canvasWidth = 960;
const compactCanvasHeight = 820;
const fullWidthCanvasHeight = 660;
const paddingX = 10;
const paddingTop = 18;
const paddingBottom = 18;
const shortcutBarHeight = 36;
const baseFontSize = 17;
const baseLineHeight = 25;
const baseColumns = 90;
let historyLineCache: { source: string; columns: number; lines: string[] } | undefined;
type PreviewLine = string | InteractiveTerminalLine;

export function terminalPreviewMarkdown(snapshot: InteractiveSnapshot, options: TerminalPreviewOptions): string {
  const scale = Math.max(0.65, Math.min(2, options.scale || 1));
  const viewportHeight = options.fullWidth ? fullWidthCanvasHeight : compactCanvasHeight;
  const viewportWidth = options.fullWidth ? 1_500 : canvasWidth;
  const contentTop = paddingTop + shortcutBarHeight;
  const fontSize = baseFontSize * scale;
  const lineHeight = baseLineHeight * scale;
  const { columns, rows: visibleRows } = terminalPreviewDimensions(scale, Boolean(options.fullWidth), viewportHeight);
  const historyLines = snapshot.historyOutput ? cachedWrappedHistory(snapshot.historyOutput, columns) : [];
  const liveSource = snapshot.output.trim() || (historyLines.length === 0 ? idleTerminalText(snapshot) : "");
  const structuredLines = snapshot.terminalLines?.length
    ? terminalContentLines(snapshot.terminalLines, snapshot.terminalCursor?.line)
    : undefined;
  const styledLive = structuredLines?.length ? measureStyledTerminalLines(structuredLines, columns) : undefined;
  const plainLiveLines = styledLive ? [] : wrapTerminalSource(liveSource, columns);
  const liveLineCount = styledLive?.totalRows || plainLiveLines.length;
  const separatorLines = historyLines.length > 0 && liveLineCount > 0 ? 1 : 0;
  const totalLines = historyLines.length + separatorLines + liveLineCount;
  const maximumOffset = Math.max(0, totalLines - visibleRows);
  const scrollOffset = Math.max(0, Math.min(Math.floor(options.scrollOffset || 0), maximumOffset));
  const end = totalLines - scrollOffset;
  const start = Math.max(0, end - visibleRows);
  const visibleLines = terminalViewportLines({
    historyLines,
    plainLiveLines,
    styledLive,
    separatorLines,
    columns,
    start,
    end,
  });
  const colors = terminalColors();
  const bottomAlignmentRows = scrollOffset === 0 ? Math.max(0, visibleRows - visibleLines.length) : 0;

  const renderedLines = visibleLines
    .map((line, index) => {
      const displayRow = index + bottomAlignmentRows;
      const y = contentTop + fontSize + displayRow * lineHeight;
      return renderPreviewLine(line, displayRow, y, fontSize, lineHeight, contentTop, colors);
    })
    .join("\n");
  const lastLine = previewLineText(visibleLines.at(-1) || "");
  const characterWidth = fontSize * 0.61;
  const measuredCursor =
    styledLive && snapshot.terminalCursor
      ? visibleTerminalCursor(
          styledLive,
          snapshot.terminalCursor,
          columns,
          historyLines.length + separatorLines,
          start,
          end,
        )
      : undefined;
  const cursorColumn = Math.min(columns - 1, measuredCursor?.column ?? Array.from(lastLine).length);
  const cursorRow = (measuredCursor?.row ?? Math.max(0, visibleLines.length - 1)) + bottomAlignmentRows;
  const hasStructuredCursor = Boolean(styledLive && snapshot.terminalCursor);
  const showCursor =
    scrollOffset === 0 &&
    (snapshot.status === "running" || snapshot.status === "starting") &&
    (!hasStructuredCursor || Boolean(measuredCursor));
  const cursor = showCursor
    ? `<rect x="${paddingX + cursorColumn * characterWidth}" y="${contentTop + cursorRow * lineHeight}" width="${Math.max(7, characterWidth)}" height="${lineHeight}" rx="1" fill="${colors.cursor}" opacity="0.42"/>`
    : "";
  const viewLabel = shortcutLabel("chat.toggle-view");
  const scrollLabel = `${shortcutLabel("chat.scroll-up")}/${shortcutLabel("chat.scroll-down")}`;
  const promptLabel = `${shortcutLabel("chat.previous-prompt")}/${shortcutLabel("chat.next-prompt")}`;
  const sizeLabel = `${shortcutLabel("chat.zoom-in")}/${shortcutLabel("chat.zoom-out")}`;
  const shortcutText = `${viewLabel} ${options.fullWidth ? "Options" : "View"}  ·  ${scrollLabel} ${"Scroll"}  ·  ${promptLabel} ${"Prompts"}  ·  ${shortcutLabel("chat.delete-input")} ${"Delete"}  ·  ${shortcutLabel("terminal.escape")} Esc  ·  ${sizeLabel} ${"Size"}  ·  ⌘K ${"Actions"}`;
  const shortcutHints = `<text x="${paddingX}" y="26" fill="${colors.text}" opacity="0.62" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="${options.fullWidth ? 20 : 15}">${escapeXml(shortcutText)}</text>`;
  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${viewportWidth}" height="${viewportHeight}" viewBox="0 0 ${viewportWidth} ${viewportHeight}">`,
    shortcutHints,
    cursor,
    `<g font-family="SFMono-Regular, Menlo, Monaco, monospace" font-size="${fontSize}" xml:space="preserve">`,
    renderedLines,
    "</g>",
    "</svg>",
  ].join("\n");
  const encoded = Buffer.from(svg, "utf8").toString("base64");
  return `![Terminal ${escapeAlt(options.title)}](data:image/svg+xml;base64,${encoded})`;
}

function cachedWrappedHistory(source: string, columns: number): string[] {
  if (historyLineCache?.source === source && historyLineCache.columns === columns) return historyLineCache.lines;
  const lines = wrapTerminalSource(source, columns);
  historyLineCache = { source, columns, lines };
  return lines;
}

function wrapTerminalSource(source: string, columns: number): string[] {
  if (!source.trim()) return [];
  return source.split("\n").flatMap((line) => wrapTerminalLine(cleanTerminalLine(line), columns));
}

function terminalContentLines(lines: InteractiveTerminalLine[], cursorLine?: number): InteractiveTerminalLine[] {
  let lastContentLine = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].spans.some((span) => span.text.trim().length > 0)) {
      lastContentLine = index;
      break;
    }
  }
  const lastVisibleLine = lastContentLine >= 0 ? lastContentLine : (cursorLine ?? -1);
  return lastVisibleLine >= 0 ? lines.slice(0, lastVisibleLine + 1) : [];
}

interface StyledTerminalMeasurement {
  lines: InteractiveTerminalLine[];
  visualRowCounts: number[];
  totalRows: number;
}

function measureStyledTerminalLines(lines: InteractiveTerminalLine[], columns: number): StyledTerminalMeasurement {
  const visualRowCounts = new Array<number>(lines.length);
  let totalRows = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const length = lines[index].spans.reduce((total, span) => total + Array.from(span.text).length, 0);
    const count = Math.max(1, Math.ceil(length / columns));
    visualRowCounts[index] = count;
    totalRows += count;
  }
  return { lines, visualRowCounts, totalRows };
}

function visibleTerminalCursor(
  measurement: StyledTerminalMeasurement,
  cursor: { line: number; column: number },
  columns: number,
  liveStart: number,
  viewportStart: number,
  viewportEnd: number,
): { row: number; column: number } | undefined {
  if (measurement.lines.length === 0) return undefined;
  const logicalLine = Math.max(0, Math.min(cursor.line, measurement.lines.length - 1));
  let visualLine = liveStart;
  for (let index = 0; index < logicalLine; index += 1) visualLine += measurement.visualRowCounts[index];
  const lineLength = measurement.lines[logicalLine].spans.reduce(
    (total, span) => total + Array.from(span.text).length,
    0,
  );
  const rawColumn = Math.max(0, cursor.column);
  const displayColumn =
    rawColumn > 0 && rawColumn % columns === 0 && rawColumn >= lineLength ? rawColumn - 1 : rawColumn;
  visualLine += Math.floor(displayColumn / columns);
  if (visualLine < viewportStart || visualLine >= viewportEnd) return undefined;
  return { row: visualLine - viewportStart, column: displayColumn % columns };
}

function terminalViewportLines({
  historyLines,
  plainLiveLines,
  styledLive,
  separatorLines,
  columns,
  start,
  end,
}: {
  historyLines: string[];
  plainLiveLines: string[];
  styledLive?: StyledTerminalMeasurement;
  separatorLines: number;
  columns: number;
  start: number;
  end: number;
}): PreviewLine[] {
  const result: PreviewLine[] = [];
  const historyEnd = historyLines.length;
  const separatorEnd = historyEnd + separatorLines;
  const liveEnd = separatorEnd + (styledLive?.totalRows || plainLiveLines.length);

  appendArrayRange(result, historyLines, start, Math.min(end, historyEnd));
  if (separatorLines && start < separatorEnd && end > historyEnd) result.push("");
  if (start < liveEnd && end > separatorEnd) {
    const liveStart = Math.max(0, start - separatorEnd);
    const liveStop = Math.min(liveEnd - separatorEnd, end - separatorEnd);
    if (styledLive) result.push(...sliceStyledTerminalRows(styledLive, liveStart, liveStop, columns));
    else appendArrayRange(result, plainLiveLines, liveStart, liveStop);
  }
  return result;
}

function appendArrayRange<T>(target: T[], source: T[], start: number, end: number): void {
  const localStart = Math.max(0, start);
  const localEnd = Math.min(source.length, end);
  if (localStart < localEnd) target.push(...source.slice(localStart, localEnd));
}

function sliceStyledTerminalRows(
  measurement: StyledTerminalMeasurement,
  start: number,
  end: number,
  columns: number,
): InteractiveTerminalLine[] {
  const rows: InteractiveTerminalLine[] = [];
  let visualIndex = 0;
  for (let index = 0; index < measurement.lines.length && visualIndex < end; index += 1) {
    const count = measurement.visualRowCounts[index];
    if (visualIndex + count <= start) {
      visualIndex += count;
      continue;
    }
    for (let chunk = 0; chunk < count; chunk += 1) {
      const currentVisualRow = visualIndex + chunk;
      if (currentVisualRow >= start && currentVisualRow < end) {
        rows.push(sliceStyledTerminalLine(measurement.lines[index], chunk * columns, (chunk + 1) * columns));
      }
    }
    visualIndex += count;
  }
  return rows;
}

function sliceStyledTerminalLine(line: InteractiveTerminalLine, start: number, end: number): InteractiveTerminalLine {
  const spans: InteractiveTerminalSpan[] = [];
  let column = 0;
  for (const span of line.spans) {
    const characters = Array.from(span.text);
    const spanEnd = column + characters.length;
    const localStart = Math.max(0, start - column);
    const localEnd = Math.min(characters.length, end - column);
    if (localStart < localEnd) appendStyledText(spans, span, characters.slice(localStart, localEnd).join(""));
    column = spanEnd;
    if (column >= end) break;
  }
  return { spans };
}

function appendStyledText(spans: InteractiveTerminalSpan[], source: InteractiveTerminalSpan, text: string): void {
  const previous = spans.at(-1);
  if (previous && sameTerminalStyle(previous, source)) previous.text += text;
  else spans.push({ ...source, text });
}

function sameTerminalStyle(left: InteractiveTerminalSpan, right: InteractiveTerminalSpan): boolean {
  return (
    left.foreground === right.foreground &&
    left.background === right.background &&
    left.bold === right.bold &&
    left.dim === right.dim &&
    left.italic === right.italic &&
    left.underline === right.underline &&
    left.strikethrough === right.strikethrough &&
    left.inverse === right.inverse
  );
}

function renderPreviewLine(
  line: PreviewLine,
  lineIndex: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  contentTop: number,
  colors: TerminalColors,
): string {
  const spans = typeof line === "string" ? [{ text: line }] : line.spans;
  const fallbackColor = lineColor(previewLineText(line), colors);
  const characterWidth = fontSize * 0.61;
  let column = 0;
  const backgrounds: string[] = [];
  const text: string[] = [];

  for (const span of spans) {
    const length = Array.from(span.text).length;
    const style = resolveTerminalStyle(span, fallbackColor, colors);
    const x = paddingX + column * characterWidth;
    if (style.background && length > 0) {
      backgrounds.push(
        `<rect x="${x}" y="${contentTop + lineIndex * lineHeight}" width="${length * characterWidth}" height="${lineHeight}" fill="${style.background}" opacity="0.92"/>`,
      );
    }
    const decorations = [span.underline ? "underline" : "", span.strikethrough ? "line-through" : ""]
      .filter(Boolean)
      .join(" ");
    text.push(
      `<text x="${x}" y="${y}" fill="${style.foreground}"${span.bold ? ' font-weight="700"' : ""}${span.italic ? ' font-style="italic"' : ""}${span.dim ? ' opacity="0.58"' : ""}${decorations ? ` text-decoration="${decorations}"` : ""}>${escapeXml(span.text)}</text>`,
    );
    column += length;
  }

  return [...backgrounds, ...text].join("\n");
}

function resolveTerminalStyle(
  span: InteractiveTerminalSpan,
  fallbackColor: string,
  colors: TerminalColors,
): { foreground: string; background?: string } {
  if (span.inverse) {
    return {
      foreground: span.background || colors.surface,
      background: span.foreground || fallbackColor,
    };
  }
  return {
    foreground: span.foreground || fallbackColor,
    background: span.background,
  };
}

function previewLineText(line: PreviewLine): string {
  return typeof line === "string" ? line : line.spans.map((span) => span.text).join("");
}

export function terminalPreviewDimensions(
  scale = 1,
  fullWidth = true,
  viewportHeight?: number,
): { columns: number; rows: number } {
  const safeScale = Math.max(0.65, Math.min(2, scale));
  const resolvedViewportHeight = viewportHeight ?? (fullWidth ? fullWidthCanvasHeight : compactCanvasHeight);
  return {
    columns: Math.max(48, Math.floor((fullWidth ? 142 : baseColumns) / safeScale)),
    rows: Math.max(
      8,
      Math.floor(
        (resolvedViewportHeight - paddingTop - paddingBottom - shortcutBarHeight) / (baseLineHeight * safeScale),
      ),
    ),
  };
}

function idleTerminalText(snapshot: InteractiveSnapshot): string {
  return ["CLI Not Running", "", "$ " + snapshot.command, "", "Write a message and press Enter to start."].join("\n");
}

function cleanTerminalLine(value: string): string {
  return Array.from(value.replace(/\t/g, "  "))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
}

function wrapTerminalLine(value: string, columns: number): string[] {
  const characters = Array.from(value);
  if (characters.length === 0) return [""];
  const lines: string[] = [];
  for (let index = 0; index < characters.length; index += columns) {
    lines.push(characters.slice(index, index + columns).join(""));
  }
  return lines;
}

interface TerminalColors {
  surface: string;
  text: string;
  error: string;
  prompt: string;
  accent: string;
  secondary: string;
  cursor: string;
}

function terminalColors(): TerminalColors {
  return environment.appearance === "light"
    ? {
        surface: "#ffffff",
        text: "#242424",
        error: "#b42318",
        prompt: "#067647",
        accent: "#026aa2",
        secondary: "#6941c6",
        cursor: "#067647",
      }
    : {
        surface: "#151515",
        text: "#f2f2f2",
        error: "#fda29b",
        prompt: "#75e0a7",
        accent: "#84caff",
        secondary: "#bdb4fe",
        cursor: "#75e0a7",
      };
}

function lineColor(line: string, colors: TerminalColors): string {
  const trimmed = line.trim();
  if (/error|failed/i.test(trimmed)) return colors.error;
  if (/^[›❯$]/.test(trimmed)) return colors.prompt;
  if (/[╭╮╰╯│─]|model:|directory:|permissions:/i.test(trimmed)) return colors.accent;
  if (/^\s*[•◦]/.test(line)) return colors.secondary;
  return colors.text;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function escapeAlt(value: string): string {
  return value.replaceAll("[", "").replaceAll("]", "");
}
