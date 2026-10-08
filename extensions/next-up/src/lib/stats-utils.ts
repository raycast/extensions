import { Course, DayOfWeek } from "./types";
import { DAYS_OF_WEEK } from "./constants";
import { parseTime } from "./schedule-utils";

export interface ScheduleStats {
  totalCourses: number;
  ephemeralCount: number;
  totalWeeklyMinutes: number;
  minutesPerDay: Record<DayOfWeek, number>;
  busiestDay: DayOfWeek | null;
  averageDailyMinutes: number;
  totalUnits: number;
}

export function computeStats(courses: Course[]): ScheduleStats {
  const minutesPerDay = Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, 0])) as Record<DayOfWeek, number>;
  let totalWeeklyMinutes = 0;
  let ephemeralCount = 0;
  let totalUnits = 0;

  for (const course of courses) {
    if (course.ephemeral) ephemeralCount++;
    if (course.units) totalUnits += course.units;

    for (const slot of course.schedules) {
      const duration = Math.max(0, parseTime(slot.endTime) - parseTime(slot.startTime));
      for (const day of slot.days) {
        minutesPerDay[day] += duration;
        totalWeeklyMinutes += duration;
      }
    }
  }

  const activeDays = DAYS_OF_WEEK.filter((d) => minutesPerDay[d] > 0);
  const busiestDay = activeDays.reduce<DayOfWeek | null>(
    (max, d) => (max === null || minutesPerDay[d] > minutesPerDay[max] ? d : max),
    null,
  );

  const averageDailyMinutes = activeDays.length > 0 ? totalWeeklyMinutes / activeDays.length : 0;

  return {
    totalCourses: courses.length,
    ephemeralCount,
    totalWeeklyMinutes,
    minutesPerDay,
    busiestDay,
    averageDailyMinutes,
    totalUnits,
  };
}

export function formatHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
