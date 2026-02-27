import type { ParsedSchedule } from "../types";
import { humanizeSchedule } from "./humanize";
import { nextRunFromCalendarIntervals } from "./calendar-interval";

export function computePreview(schedule: ParsedSchedule): {
  humanReadable: string;
  nextRun: Date | null;
} {
  if (schedule.type === "interval" && schedule.startInterval) {
    const config = { Label: "preview", StartInterval: schedule.startInterval };
    return {
      humanReadable: humanizeSchedule(config),
      nextRun: new Date(Date.now() + schedule.startInterval * 1000),
    };
  }

  if (schedule.type === "calendar" && schedule.calendarIntervals) {
    const config = {
      Label: "preview",
      StartCalendarInterval:
        schedule.calendarIntervals.length === 1
          ? schedule.calendarIntervals[0]!
          : schedule.calendarIntervals,
    };
    return {
      humanReadable: humanizeSchedule(config),
      nextRun: nextRunFromCalendarIntervals(schedule.calendarIntervals),
    };
  }

  return { humanReadable: "Unknown", nextRun: null };
}
