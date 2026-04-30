/**
 * Todoist recurrence strings (`every N unit(s)`) and Raycast UI helpers for the Set Repeat menu.
 * Presets cover interval 1; free-form `every 2 day` / `every 3 weeks` style input uses `buildDynamicRepeatOptions`.
 */
import { Icon } from "@raycast/api";
import { format } from "date-fns";

import type { DateOrString, Task } from "../api";

export type RecurrenceUnit = "hour" | "day" | "week" | "month" | "year";

export const REPEAT_UNITS: RecurrenceUnit[] = ["hour", "day", "week", "month", "year"];

export function buildRecurringDueString(unit: RecurrenceUnit, interval = 1): string {
  const n = Number.isFinite(interval) ? Math.max(1, Math.floor(interval)) : 1;
  return `every ${n} ${n === 1 ? unit : `${unit}s`}`;
}

export function isHourlyDueString(s: string | undefined): boolean {
  return !!s && /^every \d+ (hour|hours)$/.test(s.trim());
}

function repeatIcon(unit: RecurrenceUnit) {
  return unit === "hour" ? Icon.Clock : Icon.Calendar;
}

/**
 * Combines an all-day `YYYY-MM-DD` due with "now" local time for hourly repeat.
 * Todoist floating dues use `YYYY-MM-DDTHH:mm:ss` (no `Z` / offset) — avoids shifting the calendar day vs `toISOString()`.
 */
function anchorAllDayDateToNow(date: string): string {
  if (date.includes("T")) return date;
  const [y, m, d] = date.split("-").map((n) => Number.parseInt(n, 10));
  if (![y, m, d].every(Number.isFinite)) return date;
  const now = new Date();
  const anchor = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  if (Number.isNaN(+anchor)) return date;
  return format(anchor, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Builds `{ string, date? }` for `item_update` from current task due + optional recurrence rule. */
export function repeatDuePayload(task: Task, recurrence?: string): DateOrString {
  if (!recurrence) {
    return task.due?.date ? { date: task.due.date } : { string: "no date" };
  }
  if (!task.due?.date) {
    return { string: recurrence };
  }
  return {
    string: recurrence,
    date: isHourlyDueString(recurrence) ? anchorAllDayDateToNow(task.due.date) : task.due.date,
  };
}

/** When the query uses Todoist-style "every 1 …", show matching titles ("Every 1 Day"); otherwise keep shorthand ("Every Day"). */
function presetDisplayTitle(unit: RecurrenceUnit, recurrence: string, searchTrimmed: string): string {
  const standardTitle = `Every ${unit[0].toUpperCase()}${unit.slice(1)}`;
  if (!/^every\s+1\b/i.test(searchTrimmed)) return standardTitle;
  return recurrence
    .split(" ")
    .map((word) => (/^\d+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

/** Presets for `every 1 hour` … `every 1 year`; search matches title or canonical `due.string` form. */
export function filterRepeatPresets(search: string) {
  const trimmed = search.trim();
  const q = trimmed.toLowerCase();
  const rows = REPEAT_UNITS.map((unit) => {
    const recurrence = buildRecurringDueString(unit, 1);
    return {
      key: recurrence,
      title: presetDisplayTitle(unit, recurrence, trimmed),
      recurrence,
      icon: repeatIcon(unit),
    };
  });
  return q
    ? rows.filter((row) => row.title.toLowerCase().includes(q) || row.recurrence.toLowerCase().includes(q))
    : rows;
}

/** Matches `every N …` for N ≥ 2 (`every 1 …` is handled by `filterRepeatPresets`). */
export function buildDynamicRepeatOptions(searchText: string) {
  const m = searchText
    .trim()
    .toLowerCase()
    .match(/^every\s+(\d+)(?:\s+([a-z]+))?$/);
  if (!m) return [];
  const interval = parseInt(m[1], 10);
  if (!Number.isFinite(interval) || interval <= 1) return [];
  const unitPrefix = m[2]?.toLowerCase();
  const units = unitPrefix
    ? REPEAT_UNITS.filter((u) => u.startsWith(unitPrefix) || `${u}s`.startsWith(unitPrefix))
    : REPEAT_UNITS;
  return units.map((unit) => {
    const plural = `${unit}s`;
    return {
      key: `${unit}-${interval}`,
      title: `Every ${interval} ${plural.charAt(0).toUpperCase()}${plural.slice(1)}`,
      recurrence: buildRecurringDueString(unit, interval),
      icon: repeatIcon(unit),
    };
  });
}
