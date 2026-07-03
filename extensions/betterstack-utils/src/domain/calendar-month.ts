import { rangeOf } from "@/common/utils/collection-utils";
import {
  addDays,
  startOfWeek,
  TimeWindow,
  toYearMonth,
  toYearWeek,
  Week,
  weeksBetween,
  YearMonth,
  YearWeek,
} from "@/common/utils/date-utils";
import { OnCallEvent } from "@/domain/on-call-event";
import { buildWeekTimeline, DayRange, WeekTimeline } from "@/domain/week-timeline";

export type CalendarMonth = {
  yearMonth: YearMonth;
  weeks: WeekData[];
};

export type WeekData = {
  id: YearWeek;
  days: Week;
  timeline: WeekTimeline;
};

export function buildCalendarMonths(timeWindow: TimeWindow, events: OnCallEvent[]): CalendarMonth[] {
  const firstWeekStartDate = startOfWeek(timeWindow.start);
  const lastWeekStartDate = startOfWeek(timeWindow.end);
  const weekCount = weeksBetween(firstWeekStartDate, lastWeekStartDate) + 1;
  const allWeeks = rangeOf(weekCount).map((weekIndex) => toWeekData(firstWeekStartDate, weekIndex, events));

  const monthKeys = allWeeks
    .flatMap((week) => week.days)
    .filter((day) => day >= timeWindow.start && day <= timeWindow.end)
    .map(toYearMonth);

  return Array.from(new Set(monthKeys))
    .toSorted()
    .map((monthKey) => toCalendarMonth(allWeeks, monthKey));
}

export function activeRange(weekDays: Week, yearMonth: YearMonth): DayRange {
  const inMonthIndices = weekDays
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => dayBelongsToMonth(day, yearMonth))
    .map(({ index }) => index);

  return { firstDay: inMonthIndices[0], lastDay: inMonthIndices[inMonthIndices.length - 1] };
}

function toCalendarMonth(allWeeks: WeekData[], monthKey: string): CalendarMonth {
  const [year, month] = monthKey.split("-").map(Number);
  const yearMonth = { year, month };
  const weeks = allWeeks.filter((week) => week.days.some((day) => dayBelongsToMonth(day, yearMonth)));

  return { yearMonth, weeks };
}

function toWeekData(startOfWeekDate: Date, weekIndex: number, events: OnCallEvent[]): WeekData {
  const days = rangeOf(7).map((dayOffset) => addDays(startOfWeekDate, weekIndex * 7 + dayOffset));

  return { id: toYearWeek(days[0]), days, timeline: buildWeekTimeline(days, events) };
}

function dayBelongsToMonth(day: Date, yearMonth: YearMonth): boolean {
  return day.getFullYear() === yearMonth.year && day.getMonth() === yearMonth.month;
}
