import moment, { type Moment } from "moment-timezone";

import type { Task } from "../domain/task";
import type { SelectionContext } from "./viewQuery";

export interface TaskDateInterval {
  startMs: number;
  endMs: number;
}

export interface LocalDay {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
}

function timeZoneOrFallback(timeZone: string, fallback: string): string {
  return moment.tz.zone(timeZone) ? timeZone : fallback;
}

function parseZonedDate(value: string, timeZone: string): Moment | undefined {
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const parsed = hasExplicitOffset
    ? moment.parseZone(value, moment.ISO_8601, true)
    : moment.tz(value, moment.ISO_8601, true, timeZone);

  return parsed.isValid() ? parsed : undefined;
}

function copyWallClock(value: Moment, timeZone: string): Moment {
  return moment.tz(
    {
      year: value.year(),
      month: value.month(),
      date: value.date(),
      hour: value.hour(),
      minute: value.minute(),
      second: value.second(),
      millisecond: value.millisecond(),
    },
    timeZone
  );
}

function taskDateInContext(value: string, task: Task, contextTimeZone: string): Moment | undefined {
  const sourceTimeZone = timeZoneOrFallback(task.timeZone, contextTimeZone);
  const parsed = parseZonedDate(value, sourceTimeZone);
  if (!parsed) return undefined;

  if (!task.isAllDay && !task.isFloating) {
    return parsed.tz(contextTimeZone);
  }

  const sourceLocalDate = parsed.tz(sourceTimeZone);
  const contextualDate = copyWallClock(sourceLocalDate, contextTimeZone);
  return task.isAllDay ? contextualDate.startOf("day") : contextualDate;
}

export function getTaskDateInterval(task: Task, contextTimeZone: string): TaskDateInterval | undefined {
  const start = task.startDate ? taskDateInContext(task.startDate, task, contextTimeZone) : undefined;
  const due = task.dueDate ? taskDateInContext(task.dueDate, task, contextTimeZone) : undefined;

  if (!start && !due) return undefined;

  const startMs = (start ?? due)!.valueOf();
  const endMs = (due ?? start)!.valueOf();
  if (endMs < startMs) return undefined;

  return { startMs, endMs };
}

export function getLocalDay(context: SelectionContext, offset: number): LocalDay {
  const start = moment.tz(context.now, context.timeZone).startOf("day").add(offset, "day");
  const end = start.clone().add(1, "day");

  return {
    id: start.format("YYYY-MM-DD"),
    title: offset === 0 ? "Today" : start.format("ddd, MMM Do"),
    startMs: start.valueOf(),
    endMs: end.valueOf(),
  };
}

export function intervalIntersectsDay(interval: TaskDateInterval, day: LocalDay): boolean {
  return interval.startMs < day.endMs && interval.endMs >= day.startMs;
}
