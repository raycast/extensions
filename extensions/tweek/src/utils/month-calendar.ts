import { TweekCustomColor, TweekTask } from "../types";
import { resolveTaskColor } from "./format-task";

export type CalendarTheme = "light" | "dark";

export interface DayCellOptions {
  /** The day number to display (1-31). */
  dayNumber: number;
  tasks: TweekTask[];
  customColors: TweekCustomColor[];
  /** Day belongs to the displayed month (otherwise rendered dimmed). */
  inMonth: boolean;
  isToday: boolean;
  /** Short weekday label drawn on the first row only (e.g. "Mon"). */
  weekdayLabel?: string;
  theme: CalendarTheme;
}

const CELL_WIDTH = 240;
const CELL_HEIGHT = 180;
const MAX_DOTS = 6;
const FALLBACK_DOT = "#8E8E93";

const THEME_COLORS: Record<
  CalendarTheme,
  { background: string; text: string; muted: string; dotStroke: string }
> = {
  light: {
    background: "#F2F2F4",
    text: "#1C1C1E",
    muted: "#6E6E73",
    dotStroke: "rgba(0,0,0,0.25)",
  },
  dark: {
    background: "#2B2B2F",
    text: "#F5F5F7",
    muted: "#A1A1A6",
    dotStroke: "rgba(255,255,255,0.25)",
  },
};

const ACCENT = "#FF6363";

/** Groups tasks by their ISO date. Tasks without a date (someday) are skipped. */
export function groupTasksByDate(tasks: TweekTask[]): Map<string, TweekTask[]> {
  const byDate = new Map<string, TweekTask[]>();
  for (const task of tasks) {
    if (!task.date) continue;
    const bucket = byDate.get(task.date);
    if (bucket) {
      bucket.push(task);
    } else {
      byDate.set(task.date, [task]);
    }
  }
  return byDate;
}

function safeHex(hex: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : FALLBACK_DOT;
}

/**
 * Renders one calendar day as an SVG string. Only numbers and values from a
 * fixed vocabulary are interpolated, so no user text ever reaches the markup.
 */
export function renderDayCellSvg({
  dayNumber,
  tasks,
  customColors,
  inMonth,
  isToday,
  weekdayLabel,
  theme,
}: DayCellOptions): string {
  const palette = THEME_COLORS[theme];
  const pending = tasks.filter((t) => !t.done).length;
  const total = tasks.length;
  const cellOpacity = inMonth ? 1 : 0.4;

  const sortedTasks = [...tasks].sort(
    (a, b) => Number(a.done) - Number(b.done),
  );
  const visible = sortedTasks.slice(0, MAX_DOTS);
  const overflow = total - visible.length;

  const dots = visible
    .map((task, i) => {
      const hex = safeHex(resolveTaskColor(task.color, customColors).hex);
      const cx = 24 + i * 28;
      const opacity = task.done ? 0.3 : 1;
      return `<circle cx="${cx}" cy="108" r="10" fill="${hex}" fill-opacity="${opacity}" stroke="${palette.dotStroke}" stroke-width="1"/>`;
    })
    .join("");

  const overflowText =
    overflow > 0
      ? `<text x="${24 + visible.length * 28 - 8}" y="115" font-size="20" font-weight="600" fill="${palette.muted}">+${overflow}</text>`
      : "";

  let summary = "";
  if (total > 0) {
    summary =
      pending === 0
        ? `all done`
        : `${pending} ${pending === 1 ? "task" : "tasks"}`;
  }
  const summaryText = summary
    ? `<text x="20" y="160" font-size="20" fill="${palette.muted}">${summary}</text>`
    : "";

  const numberBadge = isToday
    ? `<circle cx="38" cy="38" r="24" fill="${ACCENT}"/>`
    : "";
  const numberFill = isToday ? "#FFFFFF" : palette.text;
  const weekday = weekdayLabel
    ? `<text x="${CELL_WIDTH - 18}" y="34" font-size="20" font-weight="600" text-anchor="end" fill="${palette.muted}">${weekdayLabel}</text>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" viewBox="0 0 ${CELL_WIDTH} ${CELL_HEIGHT}" font-family="-apple-system, Helvetica, Arial, sans-serif">` +
    `<g opacity="${cellOpacity}">` +
    `<rect width="${CELL_WIDTH}" height="${CELL_HEIGHT}" rx="12" fill="${palette.background}"/>` +
    numberBadge +
    `<text x="38" y="49" font-size="32" font-weight="700" text-anchor="middle" fill="${numberFill}">${dayNumber}</text>` +
    weekday +
    dots +
    overflowText +
    summaryText +
    `</g></svg>`
  );
}

/** Wraps an SVG string into a data URI usable as a Raycast image source. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
