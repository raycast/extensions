import { DateTime } from "luxon";
import { DARK_PALETTE, getHourType, HourType, LIGHT_PALETTE, TimelinePalette } from "./palette";
import { SunTimes } from "./sun-times";
import { formatDelta, formatGmtOffset } from "./time-utils";
import { getCityName, getSystemTimezone, getTimezone } from "./timezones";

export interface TimelineConfig {
  baseISO: string;
  baseCityId: string | null;
  // The row for where the user is now (system time zone), tagged "Local"
  localCityId?: string;
  selectedZoneIds: string[];
  timeFormat: string;
  appearance: "light" | "dark";
  nowISO: string;
  sunTimes: Record<string, SunTimes>;
}

const HOURS_VISIBLE = 24;
const CURSOR_COLUMN = 12;
const CELL_W = 32;
const CELL_H = 32;
const CELL_GAP = 2;
const PAD_X = 12;
const TOP = 48;
const ROW_H = 68;
const HEADER_BASELINE = 15;
const CELL_TOP = 24;
const LEGEND_H = 28;
const FONT = "-apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";

const CHART_W = HOURS_VISIBLE * CELL_W;
const WIDTH = CHART_W + PAD_X * 2;

interface TimelineRow {
  zoneId: string;
  cityName: string;
  tz: string;
  localNow: DateTime;
  localCursor: DateTime;
  offsetMinutes: number;
  dayDiff: string;
  isBase: boolean;
  isLocal: boolean;
  sun: SunTimes;
}

function getDayDiff(localTime: DateTime, baseTime: DateTime): string {
  // Compare date-only values so leap years are handled correctly.
  const localDay = DateTime.utc(localTime.year, localTime.month, localTime.day).startOf("day").toMillis();
  const baseDay = DateTime.utc(baseTime.year, baseTime.month, baseTime.day).startOf("day").toMillis();
  const diff = Math.round((localDay - baseDay) / (24 * 60 * 60 * 1000));

  if (diff === 0) return "";
  if (diff > 0) return ` +${diff}`;
  return ` ${diff}`;
}

// Tag for SVG markup templates: rounds interpolated numbers to one decimal, so computed coordinates
// don't bloat the markup with values like 287.43999999999994.
function svg(strings: TemplateStringsArray, ...values: (string | number)[]): string {
  return strings.reduce((markup, part, i) => {
    if (i === 0) return part;
    const value = values[i - 1];
    return markup + (typeof value === "number" ? Math.round(value * 10) / 10 : value) + part;
  }, "");
}

// The SVG renderer on macOS 27 ignores font-weight in the stylesheet, and only understands the "bold" keyword,
// not numeric weights. So text is drawn through text(), which sets the weight as an attribute.
const BOLD_TEXT = new Set(["title", "time", "city", "day-diff", "badge", "cursor-label", "now-label", "weekday"]);

// Draws a text element. The first class decides whether it is bold; `bold` makes any text bold.
function text(
  classes: string,
  x: number,
  y: number,
  content: string,
  options: { bold?: boolean; attrs?: string } = {},
): string {
  const bold = options.bold || BOLD_TEXT.has(classes.split(" ")[0]);
  return (
    svg`<text class="${classes}" x="${x}" y="${y}"` +
    (bold ? ` font-weight="bold"` : "") +
    (options.attrs ? ` ${options.attrs}` : "") +
    `>${escapeXml(content)}</text>`
  );
}

// Text and color styles, so elements only need a class instead of repeating the same attributes.
// Only plain class selectors are used, for compatibility with simple SVG renderers.
function stylesheet(palette: TimelinePalette): string {
  return `<style>
    text { font-family: ${FONT}; }
    .title { font-size: 17px; fill: ${palette.text}; }
    .time { font-size: 15px; fill: ${palette.text}; }
    .city { font-size: 15px; fill: ${palette.text}; }
    .day-diff { font-size: 12px; fill: ${palette.accent}; }
    .badge-bg { fill-opacity: 0.18; }
    .badge { font-size: 11px; text-anchor: middle; fill-opacity: 0.85; }
    .gmt { fill: ${palette.badgeGmt}; }
    .delta { fill: ${palette.badgeDelta}; }
    .local { fill: ${palette.badgeLocal}; }
    .sun { font-size: 12px; fill: ${palette.muted}; }
    .sun-icon { fill: none; stroke: ${palette.muted}; stroke-width: 24; stroke-linecap: round; stroke-linejoin: round; }
    .cursor-label { font-size: 12px; fill: ${palette.cursorText}; }
    .now-label { font-size: 11px; text-anchor: middle; fill: ${palette.now}; }
    .now-line { stroke: ${palette.now}; stroke-width: 1.5; }
    .cursor-line { stroke: ${palette.accent}; stroke-width: 1.5; }
    .hour { font-size: 13px; text-anchor: middle; }
    .weekday { font-size: 11px; text-anchor: middle; }
    .sleep { fill: ${palette.cells.sleep.fill}; }
    .sleep-text { fill: ${palette.cells.sleep.text}; }
    .marginal { fill: ${palette.cells.marginal.fill}; }
    .marginal-text { fill: ${palette.cells.marginal.text}; }
    .work { fill: ${palette.cells.work.fill}; }
    .work-text { fill: ${palette.cells.work.text}; }
    .day-start { fill: ${palette.dayStart.fill}; }
    .day-start-text { fill: ${palette.dayStart.text}; }
    .legend { font-size: 12px; fill: ${palette.muted}; }
  </style>`;
}

// Sunrise/sunset glyphs drawn as paths (16px), since SF Symbols are not available inside the image.
function sunIcon(kind: "rise" | "set", x: number, y: number): string {
  const arrow = kind === "rise" ? "M138 98V32 M108 62L138 32L168 62" : "M138 32V98 M108 68L138 98L168 68";
  return (
    svg`<g class="sun-icon" transform="translate(${x} ${y}) scale(0.058)">` +
    `<path d="M15 222H260 M30 182H58 M218 182H246 M68 110L86 128 M212 110L194 128 ${arrow}"/>` +
    `<circle cx="140" cy="175" r="48"/></g>`
  );
}

// Rough text width for positioning badges next to text (SVG offers no text measurement).
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const char of text) {
    if (/[0-9]/.test(char)) width += 0.6;
    else if (/[ilj.,:'|!tf]/.test(char)) width += 0.28;
    else if (char === "r") width += 0.38;
    else if (/[mwMW]/.test(char)) width += 0.88;
    else if (/[A-Z]/.test(char)) width += 0.68;
    else if (char === " ") width += 0.28;
    else width += 0.56;
  }
  return width * fontSize;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Places the cursor time label next to the cursor line in the header line of a row: preferably on the side away
// from the "now" line, and never over the header text and badges on the left or the sun times on the right.
function placeCursorLabel(
  cursorX: number,
  nowX: number | null,
  width: number,
  minX: number,
  maxX: number,
): { x: number; anchor: "start" | "end" } {
  type Side = { x: number; anchor: "start" | "end"; left: number; right: number };
  const gap = 4;
  const right: Side = { x: cursorX + gap, anchor: "start", left: cursorX + gap, right: cursorX + gap + width };
  const left: Side = { x: cursorX - gap, anchor: "end", left: cursorX - gap - width, right: cursorX - gap };
  const sides = nowX !== null && nowX > cursorX ? [left, right] : [right, left];
  const fits = (side: Side) =>
    side.left >= minX && side.right <= maxX && (nowX === null || nowX < side.left - 2 || nowX > side.right + 2);
  const side = sides.find(fits) ?? sides.find((candidate) => candidate.left >= minX && candidate.right <= maxX);
  if (side) return { x: side.x, anchor: side.anchor };
  return { x: Math.max(right.x, minX), anchor: "start" };
}

// Horizontal positions shared by every row's header, so the city names and badges each line up in a column.
interface HeaderLayout {
  cityX: number;
  badgeX: number;
  gmtWidth: number;
}

const badgeWidth = (text: string) => estimateTextWidth(text, 11) * 1.1 + 16;

function getHeaderLayout(rows: TimelineRow[], timeFormat: string): HeaderLayout {
  const timeColumnWidth = estimateTextWidth(timeFormat.includes("HH") ? "00:00" : "00:00 AM", 15) * 1.06;
  const cityX = PAD_X + timeColumnWidth + 8;
  const headerEnds = rows.map(
    (row) =>
      cityX + estimateTextWidth(row.cityName, 15) + (row.dayDiff ? 6 + estimateTextWidth(row.dayDiff.trim(), 12) : 0),
  );
  return {
    cityX,
    badgeX: Math.max(...headerEnds) + 12,
    gmtWidth: Math.max(...rows.map((row) => badgeWidth(formatGmtOffset(row.localCursor.offset)))),
  };
}

function renderRow(
  row: TimelineRow,
  rowIndex: number,
  baseHourStart: DateTime,
  cursorMs: number,
  lines: { cursorX: number | null; nowX: number | null },
  timeFormat: string,
  layout: HeaderLayout,
): string {
  const top = TOP + rowIndex * ROW_H;
  const cellTop = top + CELL_TOP;
  const chartLeft = PAD_X;
  const bandCenterMs = baseHourStart.toMillis() + 30 * 60 * 1000;

  const gmt = formatGmtOffset(row.localCursor.offset);
  const timeText = row.localNow.toFormat(timeFormat);
  const chartRight = chartLeft + CHART_W;
  const baseline = top + HEADER_BASELINE;

  let markup = "";
  // Times start at the chart's left edge; city names and badges sit in columns shared by all rows.
  markup += text("time", chartLeft + 1, baseline, timeText);
  markup += text("city", layout.cityX, baseline, row.cityName);
  // The day difference is a separate <text> rather than a <tspan>: some Raycast versions shift the whole
  // line's baseline down when a text element mixes font sizes, misaligning the city name with the time.
  if (row.dayDiff) {
    const dayDiffX = layout.cityX + estimateTextWidth(row.cityName, 15) + 6;
    markup += text("day-diff", dayDiffX, baseline, row.dayDiff.trim());
  }

  // Badges are vertically centered on the capital letters of the time and city name.
  const badges = [{ text: gmt, kind: "gmt", width: layout.gmtWidth }];
  if (!row.isBase) {
    const delta = formatDelta(row.offsetMinutes, "text");
    badges.push({ text: delta, kind: "delta", width: badgeWidth(delta) });
  }
  if (row.isLocal) badges.push({ text: "Local", kind: "local", width: badgeWidth("Local") });
  let badgeX = layout.badgeX;
  for (const badge of badges) {
    markup += svg`<rect class="badge-bg ${badge.kind}" x="${badgeX}" y="${baseline - 15}" width="${badge.width}" height="19" rx="5"/>`;
    markup += text(`badge ${badge.kind}`, badgeX + badge.width / 2, baseline - 1.6, badge.text);
    badgeX += badge.width + 6;
  }

  const sunTimeWidth = estimateTextWidth(timeFormat.includes("HH") ? "00:00" : "00:00 AM", 12);
  const sunItemWidth = 20 + sunTimeWidth;
  const sunsetX = chartRight - sunItemWidth;
  const sunriseX = sunsetX - 14 - sunItemWidth;
  markup += sunIcon("rise", sunriseX, top + 3);
  markup += text("sun", sunriseX + 20, baseline, row.sun.sunrise);
  markup += sunIcon("set", sunsetX, top + 3);
  markup += text("sun", sunsetX + 20, baseline, row.sun.sunset);

  if (lines.cursorX !== null) {
    const cursorText = row.localCursor.toFormat(timeFormat);
    const width = estimateTextWidth(cursorText, 12) * 1.1;
    const label = placeCursorLabel(lines.cursorX, lines.nowX, width, badgeX + 4, sunriseX - 10);
    markup += text("cursor-label", label.x, baseline, cursorText, { attrs: `text-anchor="${label.anchor}"` });
  }

  // Each row is laid out on its own local hour grid, positioned by absolute time, so zones with
  // fractional offsets (e.g. +5:30) stay aligned with the shared cursor column.
  const anchor = DateTime.fromMillis(bandCenterMs).setZone(row.tz).startOf("hour");

  // Cells are clipped to the chart by hand rather than with <clipPath>: some Raycast versions render
  // a clipPath's rect as a filled black box instead of using it as a clip.
  for (let j = -CURSOR_COLUMN - 2; j <= HOURS_VISIBLE - CURSOR_COLUMN + 1; j++) {
    const start = anchor.plus({ hours: j });
    const hour = start.hour;
    const x = chartLeft + CURSOR_COLUMN * CELL_W + ((start.toMillis() - baseHourStart.toMillis()) / 3600000) * CELL_W;
    const left = Math.max(x + CELL_GAP / 2, chartLeft);
    const right = Math.min(x + CELL_W - CELL_GAP / 2, chartRight);
    if (right - left < 1) continue;

    const cellClass = hour === 0 ? "day-start" : getHourType(hour);
    const isCursor = start.toMillis() <= cursorMs && cursorMs < start.plus({ hours: 1 }).toMillis();
    const centerX = x + CELL_W / 2;
    const centerY = cellTop + CELL_H / 2;

    markup += svg`<rect class="${cellClass}" x="${left}" y="${cellTop}" width="${right - left}" height="${CELL_H}" rx="${Math.min(5, (right - left) / 2)}"/>`;
    // Labels are only drawn on fully visible cells, so they never spill past the chart edges.
    if (right - left < CELL_W - CELL_GAP - 0.5) continue;
    markup +=
      hour === 0
        ? // Baseline sits half a cap height below the center (dominant-baseline is not supported everywhere).
          text(`weekday ${cellClass}-text`, centerX, centerY + 4, start.toFormat("ccc"), {
            attrs: svg`transform="rotate(-90 ${centerX} ${centerY})"`,
          })
        : text(`hour ${cellClass}-text`, centerX, cellTop + 20, String(hour), { bold: isCursor });
  }

  return markup;
}

export function generateTimelineSvg(config: TimelineConfig): string {
  const { baseISO, baseCityId, localCityId, selectedZoneIds, timeFormat, appearance, nowISO, sunTimes } = config;
  const palette = appearance === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

  const baseZoneId = baseCityId ? getTimezone(baseCityId) : getSystemTimezone();
  const cursor = DateTime.fromISO(baseISO).setZone(baseZoneId);
  const cursorMs = cursor.toMillis();
  const baseHourStart = cursor.startOf("hour");
  const now = DateTime.fromISO(nowISO);
  const nowMs = now.toMillis();

  const allZoneIds = baseCityId ? [baseCityId, ...selectedZoneIds.filter((id) => id !== baseCityId)] : selectedZoneIds;

  const rows: TimelineRow[] = allZoneIds.map((zoneId) => {
    const tz = getTimezone(zoneId);
    const localNow = now.setZone(tz);
    const localCursor = cursor.setZone(tz);
    return {
      zoneId,
      cityName: getCityName(zoneId),
      tz,
      localNow,
      localCursor,
      offsetMinutes: localCursor.offset - cursor.offset,
      dayDiff: getDayDiff(localNow, now.setZone(baseZoneId)),
      isBase: !!baseCityId && zoneId === baseCityId,
      isLocal: zoneId === localCityId,
      sun: sunTimes[zoneId] ?? { sunrise: "—", sunset: "—" },
    };
  });

  const chartHeight = TOP + rows.length * ROW_H - (ROW_H - CELL_TOP - CELL_H) + 4;
  const height = chartHeight + LEGEND_H;

  let markup = svg`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">`;
  markup += stylesheet(palette);
  markup += text("title", PAD_X, 20, cursor.toFormat("cccc, LLLL d, yyyy"));
  const msToX = (ms: number) => PAD_X + CURSOR_COLUMN * CELL_W + ((ms - baseHourStart.toMillis()) / 3600000) * CELL_W;
  const lineBottom = chartHeight - 2;
  const chartRight = PAD_X + CHART_W;
  const nowX = msToX(nowMs) >= PAD_X && msToX(nowMs) <= chartRight ? msToX(nowMs) : null;
  // When the cursor is at the current time, only the "now" line is drawn.
  const cursorX = cursorMs !== nowMs ? msToX(cursorMs) : null;

  const layout = getHeaderLayout(rows, timeFormat);
  rows.forEach((row, i) => {
    markup += renderRow(row, i, baseHourStart, cursorMs, { cursorX, nowX }, timeFormat, layout);
  });

  if (nowX !== null) {
    markup += svg`<line class="now-line" x1="${nowX}" y1="${TOP - 6}" x2="${nowX}" y2="${lineBottom}"/>`;
    markup += text("now-label", Math.min(Math.max(nowX, PAD_X + 10), chartRight - 10), TOP - 9, "now");
  }
  if (cursorX !== null) {
    markup += svg`<line class="cursor-line" x1="${cursorX}" y1="${TOP - 6}" x2="${cursorX}" y2="${lineBottom}"/>`;
  }

  const legendItems: { type: HourType; label: string }[] = [
    { type: "work", label: "Work" },
    { type: "marginal", label: "Early/Late" },
    { type: "sleep", label: "Sleep" },
  ];
  let legendX = PAD_X;
  for (const item of legendItems) {
    markup += svg`<rect class="${item.type}" x="${legendX}" y="${chartHeight + 8}" width="14" height="14" rx="3.5"/>`;
    markup += text("legend", legendX + 20, chartHeight + 19, item.label);
    legendX += 20 + estimateTextWidth(item.label, 12) + 18;
  }
  markup += "</svg>";
  return markup;
}
