import type { PlistConfig, Schedule } from "../types";
import { nextRunFromCalendarIntervals } from "./calendar-interval";
import { nextRunFromStartInterval } from "./start-interval";
import { humanizeSchedule } from "./humanize";

export {
  nextRunFromCalendarIntervals,
  nextRunFromCalendarInterval,
} from "./calendar-interval";
export { nextRunFromStartInterval } from "./start-interval";
export { humanizeSchedule, formatTime12h } from "./humanize";
export { computePreview } from "./preview";

export async function computeSchedule(config: PlistConfig): Promise<Schedule> {
  if (config.StartCalendarInterval !== undefined) {
    const intervals = Array.isArray(config.StartCalendarInterval)
      ? config.StartCalendarInterval
      : [config.StartCalendarInterval];

    return {
      type: "calendar",
      humanReadable: humanizeSchedule(config),
      nextRun: nextRunFromCalendarIntervals(intervals),
    };
  }

  if (config.StartInterval !== undefined) {
    const logPath = config.StandardOutPath ?? config.StandardErrorPath;

    return {
      type: "interval",
      humanReadable: humanizeSchedule(config),
      nextRun: await nextRunFromStartInterval(config.StartInterval, logPath),
    };
  }

  if (config.RunAtLoad) {
    return {
      type: "run-at-load",
      humanReadable: humanizeSchedule(config),
      nextRun: null,
    };
  }

  return {
    type: "on-demand",
    humanReadable: humanizeSchedule(config),
    nextRun: null,
  };
}
