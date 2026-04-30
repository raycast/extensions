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
 * All-day due + current local clock for hourly recurrence anchors.
 *
 * Todoist Sync "floating" due datetimes expect `YYYY-MM-DDTHH:MM:SS` with no zone suffix
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

export function repeatDuePayload(task: Task, recurrence?: string): DateOrString {
  return recurrence
    ? task.due?.date
      ? {
          string: recurrence,
          date: isHourlyDueString(recurrence) ? anchorAllDayDateToNow(task.due.date) : task.due.date,
        }
      : { string: recurrence }
    : task.due?.date
      ? { date: task.due.date }
      : { string: "no date" };
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

export function buildDynamicRepeatOptions(searchText: string) {
  const m = searchText
    .trim()
    .toLowerCase()
    .match(/^every\s+(\d+)(?:\s+([a-z]+))?$/);
  if (!m) return [];
  const interval = parseInt(m[1], 10);
  if (!Number.isFinite(interval) || interval <= 1) return [];
  const t = m[2]?.toLowerCase();
  const units = t ? REPEAT_UNITS.filter((u) => u.startsWith(t) || `${u}s`.startsWith(t)) : REPEAT_UNITS;
  return units.map((unit) => {
    const lab = interval === 1 ? unit : `${unit}s`;
    return {
      key: `${unit}-${interval}`,
      title: `Every ${interval} ${lab.charAt(0).toUpperCase()}${lab.slice(1)}`,
      recurrence: buildRecurringDueString(unit, interval),
      icon: repeatIcon(unit),
    };
  });
}
