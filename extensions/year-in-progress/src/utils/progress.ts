import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  type Day,
  getDayOfYear,
  isLeapYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { DefaultProgressId, Progress, ProgressSnapshot } from "../types";

export function getYearProgressNum(now = new Date()) {
  if (!Number.isFinite(now.getTime())) return 0;
  const dayOfYear = getDayOfYear(now);
  const daysInYear = isLeapYear(now) ? 366 : 365;
  return Math.floor((dayOfYear / daysInYear) * 100);
}

export function getQuarterProgressNum(now = new Date()) {
  const startDate = startOfQuarter(now);
  return getProgressNumByDate(startDate, addQuarters(startDate, 1), now);
}

export function getProgressNumByDate(startDate: Date, endDate: Date, now = new Date()) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const currentTime = now.getTime();
  if (![startTime, endTime, currentTime].every(Number.isFinite) || endTime <= startTime) return 0;
  return Math.floor(Math.max(0, Math.min(1, (currentTime - startTime) / (endTime - startTime))) * 100);
}

export function getDefaultProgress(now = new Date(), weekStartsOn: Day = 1): Progress[] {
  const yearStart = startOfYear(now);
  const quarterStart = startOfQuarter(now);
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn });
  const dayStart = startOfDay(now);

  const create = (id: DefaultProgressId, label: string, startDate: Date, endDate: Date, pinned = false): Progress => ({
    id,
    title: `${label} In Progress`,
    type: "default",
    pinned,
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    progressNum: id === "default:year" ? getYearProgressNum(now) : getProgressNumByDate(startDate, endDate, now),
    menubar: { shown: true, title: label },
    showAsCommand: false,
  });

  return [
    create("default:year", "Year", yearStart, addYears(yearStart, 1), true),
    create("default:quarter", "Quarter", quarterStart, addQuarters(quarterStart, 1), true),
    create("default:month", "Month", monthStart, addMonths(monthStart, 1)),
    create("default:week", "Week", weekStart, addWeeks(weekStart, 1)),
    create("default:day", "Day", dayStart, addDays(dayStart, 1)),
  ];
}

export function getSubtitle(progressNum: number) {
  const percent = Number.isFinite(progressNum) ? Math.floor(Math.max(0, Math.min(100, progressNum))) : 0;
  let progressBar = "";
  for (let i = 0; i < 10; i++) progressBar += percent > i * 10 ? "■" : "□";
  return `${progressBar} ${percent}%`;
}

export function getCommandSubtitle(
  snapshot: Pick<ProgressSnapshot, "allProgress" | "commandProgressId">
): string | undefined {
  const progress =
    snapshot.allProgress.find((item) => item.id === snapshot.commandProgressId) ??
    snapshot.allProgress.find((item) => item.id === "default:year");
  if (!progress) return undefined;
  return `${progress.menubar.title || progress.title} ${getSubtitle(progress.progressNum)}`;
}
