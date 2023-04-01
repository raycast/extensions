import { getPreferenceValues } from "@raycast/api";
import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  getDayOfYear,
  getQuarter,
  isLeapYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { PerferenceValue, Progress, ProgressBarOptions } from "../types";

const now = new Date();
const currentTime = now.getTime();
const { weekStartsOn } = getPreferenceValues<PerferenceValue>();

export function getYear() {
  return now.getFullYear();
}

export function getProgressBar(progress: number, options: ProgressBarOptions = {}) {
  const { limit = 10 } = options;
  let progressBar = "";
  for (let i = 0; i < limit; i++) {
    progressBar += progress > i * limit ? "■" : "□";
  }
  return progressBar;
}

function getYearProgress(): Progress {
  function getYearProgressNumber() {
    const dayOfYear = getDayOfYear(now);
    const daysInYear = isLeapYear(now) ? 366 : 365;
    return Math.floor((dayOfYear / daysInYear) * 100);
  }
  function getYearProgressDate() {
    const startDate = startOfYear(now);
    const endDate = endOfYear(now);
    return { startDate, endDate };
  }

  return {
    key: "year",
    title: "Year In Progress",
    menubarTitle: "Year",
    showInMenuBar: true,
    startDate: getYearProgressDate().startDate,
    endDate: getYearProgressDate().endDate,
    getProgressNumberFn: getYearProgressNumber,
    type: "default",
    pinned: true,
    editable: false,
  };
}

function getQuarterProgress(): Progress {
  function getQuarterProgressNumber() {
    const quarter = getQuarter(now);
    const nextQuarterDate = new Date();
    if (quarter === 4) {
      nextQuarterDate.setFullYear(now.getFullYear() + 1, 0, 1);
    } else {
      nextQuarterDate.setFullYear(now.getFullYear(), quarter * 3, 1);
    }

    const startQuarterTime = startOfQuarter(now).getTime();
    const nextQuarterTime = nextQuarterDate.getTime();

    return Math.floor(((currentTime - startQuarterTime) / (nextQuarterTime - startQuarterTime)) * 100);
  }
  function getQuarterProgressDate() {
    const startDate = startOfQuarter(now);
    const endDate = endOfQuarter(now);
    return { startDate, endDate };
  }

  return {
    key: "quarter",
    title: "Quarter In Progress",
    menubarTitle: "Quarter",
    showInMenuBar: true,
    startDate: getQuarterProgressDate().startDate,
    endDate: getQuarterProgressDate().endDate,
    getProgressNumberFn: getQuarterProgressNumber,
    type: "default",
    pinned: true,
    editable: false,
  };
}

function getMonthProgress(): Progress {
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  function getMonthProgressNumber() {
    return getProgress(startDate, endDate);
  }
  function getMonthProgressDate() {
    return { startDate, endDate };
  }

  return {
    key: "month",
    title: "Month In Progress",
    menubarTitle: "Month",
    showInMenuBar: true,
    startDate: getMonthProgressDate().startDate,
    endDate: getMonthProgressDate().endDate,
    getProgressNumberFn: getMonthProgressNumber,
    type: "default",
    editable: false,
  };
}

function getWeekProgress(): Progress {
  const startDate = startOfWeek(now, { weekStartsOn: +weekStartsOn as any });
  const endDate = endOfWeek(now, { weekStartsOn: +weekStartsOn as any });

  function getWeekProgressNumber() {
    return getProgress(startDate, endDate);
  }
  function getWeekProgressDate() {
    return { startDate, endDate };
  }

  return {
    key: "week",
    title: "Week In Progress",
    menubarTitle: "Week",
    showInMenuBar: true,
    startDate: getWeekProgressDate().startDate,
    endDate: getWeekProgressDate().endDate,
    getProgressNumberFn: getWeekProgressNumber,
    type: "default",
    editable: false,
  };
}

function getDayProgress(): Progress {
  const startDate = startOfDay(now);
  const endDate = endOfDay(now);

  function getDayprogressNumber() {
    return getProgress(startDate, endDate);
  }
  function getDayProgressDate() {
    return { startDate, endDate };
  }

  return {
    key: "day",
    title: "Day In Progress",
    menubarTitle: "Day",
    showInMenuBar: true,
    startDate: getDayProgressDate().startDate,
    endDate: getDayProgressDate().endDate,
    getProgressNumberFn: getDayprogressNumber,
    type: "default",
    editable: false,
  };
}

export function getProgress(startDate: Date, endDate: Date) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const currentTime = new Date().getTime();

  const progress = (currentTime - startTime) / (endTime - startTime);

  return progress >= 1 ? 100 : Math.floor(progress * 100);
}

export function getDefaultProgress() {
  return [getYearProgress(), getQuarterProgress(), getMonthProgress(), getWeekProgress(), getDayProgress()];
}

export function getProgressSubtitle(progressNumber: number) {
  return `${getProgressBar(progressNumber)} ${progressNumber}%`;
}

export function getProgressNumber(progress: Progress) {
  if (!progress) return 0;
  return progress.getProgressNumberFn?.() || getProgress(progress.startDate, progress.endDate);
}
