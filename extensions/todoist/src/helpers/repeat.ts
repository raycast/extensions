import { Icon } from "@raycast/api";

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

export function repeatDuePayload(task: Task, recurrence?: string): DateOrString {
  return recurrence
    ? task.due?.date
      ? { string: recurrence, date: task.due.date }
      : { string: recurrence }
    : task.due?.date
      ? { date: task.due.date }
      : { string: "no date" };
}

export function filterRepeatPresets(search: string) {
  const q = search.trim().toLowerCase();
  const rows = REPEAT_UNITS.map((unit) => {
    const recurrence = buildRecurringDueString(unit, 1);
    return {
      key: recurrence,
      title: `Every ${unit[0].toUpperCase()}${unit.slice(1)}`,
      recurrence,
      icon: repeatIcon(unit),
    };
  });
  return q ? rows.filter((row) => row.title.toLowerCase().includes(q)) : rows;
}

export function buildDynamicRepeatOptions(searchText: string) {
  const m = searchText
    .trim()
    .toLowerCase()
    .match(/^every\s+(\d+)(?:\s+([a-z]+))?$/i);
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
