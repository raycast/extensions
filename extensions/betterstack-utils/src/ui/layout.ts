import { formatUserName, OnCallEvent } from "../domain/on-call-event";
import { RotaColors } from "../common/colors";
import { FONT_FAMILY } from "../common/font";

export interface WeekSpanBar {
  startDayIndex: number;
  startFraction: number;
  endDayIndex: number;
  endFraction: number;
  label: string;
  color: string;
  lane: number;
}

export interface SummaryEntry {
  name: string;
  hours: number;
  color: string;
}

interface DayPosition {
  dayIndex: number;
  fraction: number;
}

export const LAYOUT = {
  WIDTH: 1160,
  BLOCK_GAP: 40,
  BLOCK_HEADER_HEIGHT: 44,
  DAY_WIDTH: 1160 / 7,
  DAY_HEADER_HEIGHT: 30,
  ROW_TOP: 40,
  ROW_HEIGHT: 42,
  BAR_GAP: 4,
  ROW_BOTTOM_PAD: 10,
  H_GAP: 3,
  DAY_MS: 24 * 3600 * 1000,
  SUMMARY_GAP: 12,
  PILL_GAP: 36,
  ON_CALL_PILL_TOP_PADDING: 544,
} as const;

export const SUMMARY = {
  FONT: FONT_FAMILY,
  BLOCK_HEIGHT: 100,
  MONTH_COL_WIDTH: 200,
  COLS_THRESHOLD: 5,
  VERTICAL_ROW_HEIGHT: 36,
  VERTICAL_PADDING: 14,
} as const;

export function weekRowHeight(maxLanes: number): number {
  return (
    LAYOUT.ROW_TOP + maxLanes * LAYOUT.ROW_HEIGHT + Math.max(0, maxLanes - 1) * LAYOUT.BAR_GAP + LAYOUT.ROW_BOTTOM_PAD
  );
}

export function summaryBlockHeight(entryCount: number): number {
  return entryCount * SUMMARY.VERTICAL_ROW_HEIGHT + SUMMARY.VERTICAL_PADDING * 2;
}

export function formatDaysHours(totalHours: number): string {
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);
  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days}d`;

  return `${hours}h`;
}

export function truncateLabel(label: string, availableWidth: number, fontSize: number): string {
  const charWidth = fontSize * 0.58;
  const maxChars = Math.floor(availableWidth / charWidth);
  if (label.length <= maxChars) return label;

  return label.slice(0, Math.max(maxChars - 1, 1)) + "…";
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export function formatMonthLabel(currentMonth: { year: number; month: number }): string {
  return new Date(currentMonth.year, currentMonth.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function buildWeekSpanBars(
  days: Date[],
  events: OnCallEvent[],
  currentMonth: { year: number; month: number },
  colorMap: Map<string, string>,
): WeekSpanBar[] {
  const dayStarts = toDayStarts(days);
  const range = inMonthRange(days, currentMonth.year, currentMonth.month);
  if (!range) return [];

  const { first, last } = range;
  const windowStart = dayStarts[first];
  const windowEnd = dayStarts[last] + LAYOUT.DAY_MS;

  const bars = events
    .map((event) => {
      const eventStart = new Date(event.started_at).getTime();
      const eventEnd = new Date(event.ended_at).getTime();
      const overlap = clampToWindow(eventStart, eventEnd, windowStart, windowEnd);

      return overlap ? eventToLanedBar(event, overlap, dayStarts, first, last, colorMap) : null;
    })
    .filter((bar): bar is Omit<WeekSpanBar, "lane"> => bar !== null)
    .sort((a, b) => a.startDayIndex + a.startFraction - (b.startDayIndex + b.startFraction));

  return assignSpanLanes(bars);
}

export function computeMonthSummary(
  year: number,
  month: number,
  events: OnCallEvent[],
  colorMap: Map<string, string>,
): SummaryEntry[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const hoursByName = accumulateEventHours(events, monthStart, monthEnd);

  return [...hoursByName.entries()]
    .map(([name, hours]) => ({ name, hours, color: colorMap.get(name) ?? RotaColors.GREEN }))
    .sort((a, b) => b.hours - a.hours);
}

function toDayStarts(days: Date[]): number[] {
  return days.map((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime());
}

function inMonthRange(days: Date[], year: number, month: number): { first: number; last: number } | null {
  const indices = days
    .map((date, index) => ({ date, index }))
    .filter(({ date }) => date.getFullYear() === year && date.getMonth() === month)
    .map(({ index }) => index);

  if (indices.length === 0) return null;

  return { first: indices[0], last: indices[indices.length - 1] };
}

function clampToWindow(
  eventStart: number,
  eventEnd: number,
  windowStart: number,
  windowEnd: number,
): { start: number; end: number } | null {
  const start = Math.max(eventStart, windowStart);
  const end = Math.min(eventEnd, windowEnd);

  return end > start ? { start, end } : null;
}

function dayFraction(timestamp: number, dayStart: number): number {
  return (timestamp - dayStart) / LAYOUT.DAY_MS;
}

function findStartPosition(timestamp: number, dayStarts: number[], from: number, to: number): DayPosition {
  const days = dayStarts.slice(from, to + 1);
  const match = days.findIndex((start) => timestamp >= start && timestamp < start + LAYOUT.DAY_MS);
  const dayIndex = from + match;
  if (match === -1) return { dayIndex: from, fraction: 0 };

  return { dayIndex, fraction: dayFraction(timestamp, dayStarts[dayIndex]) };
}

function findEndPosition(timestamp: number, dayStarts: number[], from: number, to: number): DayPosition {
  const days = dayStarts.slice(from, to + 1);
  const match = days.findIndex((start) => timestamp > start && timestamp <= start + LAYOUT.DAY_MS);
  const dayIndex = from + match;
  if (match === -1) return { dayIndex: to, fraction: 1.0 };

  return { dayIndex, fraction: dayFraction(timestamp, dayStarts[dayIndex]) };
}

function eventToLanedBar(
  event: OnCallEvent,
  overlap: { start: number; end: number },
  dayStarts: number[],
  first: number,
  last: number,
  colorMap: Map<string, string>,
): Omit<WeekSpanBar, "lane"> {
  const label = formatUserName(event.user);
  const { dayIndex: startDayIndex, fraction: startFraction } = findStartPosition(overlap.start, dayStarts, first, last);
  const { dayIndex: endDayIndex, fraction: endFraction } = findEndPosition(overlap.end, dayStarts, first, last);

  return {
    startDayIndex,
    startFraction,
    endDayIndex,
    endFraction,
    label,
    color: colorMap.get(label) ?? RotaColors.GREEN,
  };
}

function assignSpanLanes(bars: Omit<WeekSpanBar, "lane">[]): WeekSpanBar[] {
  const laneEnds: number[] = [];
  return bars.map((bar) => {
    const absStart = bar.startDayIndex + bar.startFraction;
    const absEnd = bar.endDayIndex + bar.endFraction;
    const laneFound = laneEnds.findIndex((end) => end <= absStart);
    const lane = laneFound === -1 ? laneEnds.length : laneFound;
    laneEnds[lane] = absEnd;

    return { ...bar, lane };
  });
}

function accumulateEventHours(events: OnCallEvent[], monthStart: Date, monthEnd: Date): Map<string, number> {
  return events.reduce((totalHours, event) => {
    const overlapStart = Math.max(new Date(event.started_at).getTime(), monthStart.getTime());
    const overlapEnd = Math.min(new Date(event.ended_at).getTime(), monthEnd.getTime());
    const hours = (overlapEnd - overlapStart) / (3600 * 1000);
    const name = formatUserName(event.user);

    return overlapEnd <= overlapStart ? totalHours : totalHours.set(name, (totalHours.get(name) ?? 0) + hours);
  }, new Map<string, number>());
}
