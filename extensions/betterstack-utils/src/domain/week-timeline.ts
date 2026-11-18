import { OnCallEvent } from "@/domain/on-call-event";
import { DAY_MS, startOfDay, endOfDay, Week, TimeWindow } from "@/common/utils/date-utils";
import { User } from "@/domain/user";
import { Optional } from "@/common/utils/optional-utils";
import { TimeInterval } from "@/domain/time-interval";

export type WeekTimeline = WeekEventTimeline[];

export interface WeekEventTimeline {
  startDayIndex: number;
  endDayIndex: number;
  startFraction: number;
  endFraction: number;
  user: User;
}

export interface DayRange {
  firstDay: number;
  lastDay: number;
}

export function buildWeekTimeline(weekDays: Week, events: OnCallEvent[]): WeekTimeline {
  const weekWindow = toWeekWindow(weekDays);

  return events
    .map((event) => toWeekEventTimeline(weekWindow, weekDays, event))
    .filter((timeline) => timeline !== undefined)
    .toSorted((a, b) => a.startDayIndex + a.startFraction - (b.startDayIndex + b.startFraction));
}

export function clipTimelineToRange(timeline: WeekTimeline, range: DayRange): WeekTimeline {
  return timeline
    .filter((event) => event.endDayIndex >= range.firstDay && event.startDayIndex <= range.lastDay)
    .map((event) => clipEventToRange(event, range));
}

function toWeekWindow(weekDays: Date[]): TimeWindow {
  const windowStart = startOfDay(weekDays[0]);
  const windowEnd = endOfDay(weekDays[weekDays.length - 1]);

  return { start: windowStart, end: windowEnd };
}

function clampToWindow(eventWindow: TimeWindow, weekWindow: TimeWindow): Optional<TimeInterval> {
  const start = Math.max(eventWindow.start.getTime(), weekWindow.start.getTime());
  const end = Math.min(eventWindow.end.getTime(), weekWindow.end.getTime());

  return end > start ? { start, end } : undefined;
}

function toWeekEventTimeline(weekWindow: TimeWindow, weekDays: Date[], event: OnCallEvent) {
  const eventWindow = { start: new Date(event.startedAt), end: new Date(event.endedAt) };
  const overlap = clampToWindow(eventWindow, weekWindow);

  if (overlap) {
    const startPosition = findDayPosition(overlap.start, weekDays);
    const endPosition = findDayPosition(overlap.end, weekDays);

    return {
      startDayIndex: startPosition.dayIndex,
      startFraction: startPosition.fraction,
      endDayIndex: endPosition.dayIndex,
      endFraction: endPosition.fraction,
      user: event.user,
    };
  }
}

function findDayPosition(timestamp: number, weekDays: Week) {
  const dayIndex = weekDays.findIndex((day) => dayContains(day, timestamp));
  const dayStart = startOfDay(weekDays[dayIndex]).getTime();

  return dayIndex === -1
    ? { dayIndex: weekDays.length - 1, fraction: 1 }
    : { dayIndex, fraction: (timestamp - dayStart) / DAY_MS };
}

function dayContains(day: Date, timestamp: number): boolean {
  return timestamp >= startOfDay(day).getTime() && timestamp <= endOfDay(day).getTime();
}

function clipEventToRange(event: WeekEventTimeline, range: DayRange): WeekEventTimeline {
  const clampStart = event.startDayIndex < range.firstDay;
  const clampEnd = event.endDayIndex > range.lastDay;

  return {
    ...event,
    startDayIndex: clampStart ? range.firstDay : event.startDayIndex,
    startFraction: clampStart ? 0 : event.startFraction,
    endDayIndex: clampEnd ? range.lastDay : event.endDayIndex,
    endFraction: clampEnd ? 1 : event.endFraction,
  };
}
