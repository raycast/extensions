import { getPreferenceValues } from "@raycast/api";
import {
  type Day,
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
import { PerferenceValue, Progress } from "../types";

const now = new Date();
const { weekStartsOn } = getPreferenceValues<PerferenceValue>();

export function getYearProgressNum() {
  const dayOfYear = getDayOfYear(now);
  const daysInYear = isLeapYear(now) ? 366 : 365;
  return Math.floor((dayOfYear / daysInYear) * 100);
}

export function getQuarterProgressNum() {
  const quarter = getQuarter(now);
  const nextQuarterDate = new Date();
  if (quarter === 4) {
    nextQuarterDate.setFullYear(now.getFullYear() + 1, 0, 1);
  } else {
    nextQuarterDate.setFullYear(now.getFullYear(), quarter * 3, 1);
  }

  const startQuarterTime = startOfQuarter(now).getTime();
  const nextQuarterTime = nextQuarterDate.getTime();

  const currentTime = now.getTime();
  return Math.floor(((currentTime - startQuarterTime) / (nextQuarterTime - startQuarterTime)) * 100);
}

export function getProgressNumByDate(startDate: Date, endDate: Date) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const currentTime = new Date().getTime();

  const progress = (currentTime - startTime) / (endTime - startTime);

  if (progress >= 1) return 100;
  if (progress <= 0) return 0;
  return Math.floor(progress * 100);
}

function getYearProgress(): Progress {
  const startDate = startOfYear(now);
  const endDate = endOfYear(now);

  return {
    title: "Year In Progress",
    type: "default",
    pinned: true,
    progressNum: getYearProgressNum(),
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    menubar: {
      shown: true,
      title: "Year",
    },
  };
}

function getQuarterProgress(): Progress {
  const startDate = startOfQuarter(now);
  const endDate = endOfQuarter(now);

  return {
    title: "Quarter In Progress",
    type: "default",
    pinned: true,
    progressNum: getQuarterProgressNum(),
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    menubar: {
      shown: true,
      title: "Quarter",
    },
  };
}

function getMonthProgress(): Progress {
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  return {
    title: "Month In Progress",
    type: "default",
    progressNum: getProgressNumByDate(startDate, endDate),
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    menubar: {
      shown: true,
      title: "Month",
    },
  };
}

function getWeekProgress(): Progress {
  const startDate = startOfWeek(now, { weekStartsOn: +weekStartsOn as Day });
  const endDate = endOfWeek(now, { weekStartsOn: +weekStartsOn as Day });

  return {
    title: "Week In Progress",
    type: "default",
    progressNum: getProgressNumByDate(startDate, endDate),
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    menubar: {
      shown: true,
      title: "Week",
    },
  };
}

function getDayProgress(): Progress {
  const startDate = startOfDay(now);
  const endDate = endOfDay(now);

  return {
    title: "Day In Progress",
    type: "default",
    progressNum: getProgressNumByDate(startDate, endDate),
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    menubar: {
      shown: true,
      title: "Day",
    },
  };
}

function getProgressBar(progressNum: number, options: { limit?: number } = {}) {
  const { limit = 10 } = options;
  let progressBar = "";
  for (let i = 0; i < limit; i++) {
    progressBar += progressNum > i * limit ? "■" : "□";
  }
  return progressBar;
}

// To display subtitle for menubar item & x-in-progress item
export function getSubtitle(progressNum: number) {
  return `${getProgressBar(progressNum)} ${progressNum}%`;
}

export const defaultProgress = [
  getYearProgress(),
  getQuarterProgress(),
  getMonthProgress(),
  getWeekProgress(),
  getDayProgress(),
];
