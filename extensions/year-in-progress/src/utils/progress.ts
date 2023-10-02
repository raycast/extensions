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
import { PerferenceValue, Progress } from "../types";

const now = new Date();
const { weekStartsOn } = getPreferenceValues<PerferenceValue>();

function getYearProgress(): Progress {
  function getYearProgressNum() {
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
    type: "default",
    pinned: true,
    progressNum: getYearProgressNum(),
    startDate: getYearProgressDate().startDate.toDateString(),
    endDate: getYearProgressDate().endDate.toDateString(),
    menubar: {
      shown: true,
      title: "Year",
    },
  };
}

function getQuarterProgress(): Progress {
  function getQuarterProgressNum() {
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
  function getQuarterProgressDate() {
    const startDate = startOfQuarter(now);
    const endDate = endOfQuarter(now);
    return { startDate, endDate };
  }

  return {
    key: "quarter",
    title: "Quarter In Progress",
    type: "default",
    pinned: true,
    progressNum: getQuarterProgressNum(),
    startDate: getQuarterProgressDate().startDate.toDateString(),
    endDate: getQuarterProgressDate().endDate.toDateString(),
    menubar: {
      shown: true,
      title: "Quarter",
    },
  };
}

function getMonthProgress(): Progress {
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  function getMonthProgressNum() {
    return getProgressNumByDate(startDate, endDate);
  }
  function getMonthProgressDate() {
    return { startDate, endDate };
  }

  return {
    key: "month",
    title: "Month In Progress",
    type: "default",
    progressNum: getMonthProgressNum(),
    startDate: getMonthProgressDate().startDate.toDateString(),
    endDate: getMonthProgressDate().endDate.toDateString(),
    menubar: {
      shown: true,
      title: "Month",
    },
  };
}

function getWeekProgress(): Progress {
  const startDate = startOfWeek(now, { weekStartsOn: +weekStartsOn as any });
  const endDate = endOfWeek(now, { weekStartsOn: +weekStartsOn as any });

  function getWeekProgressNum() {
    return getProgressNumByDate(startDate, endDate);
  }
  function getWeekProgressDate() {
    return { startDate, endDate };
  }

  return {
    key: "week",
    title: "Week In Progress",
    type: "default",
    progressNum: getWeekProgressNum(),
    startDate: getWeekProgressDate().startDate.toDateString(),
    endDate: getWeekProgressDate().endDate.toDateString(),
    menubar: {
      shown: true,
      title: "Week",
    },
  };
}

function getDayProgress(): Progress {
  const startDate = startOfDay(now);
  const endDate = endOfDay(now);

  function getDayprogressNum() {
    return getProgressNumByDate(startDate, endDate);
  }
  function getDayProgressDate() {
    return { startDate, endDate };
  }

  return {
    key: "day",
    title: "Day In Progress",
    type: "default",
    progressNum: getDayprogressNum(),
    startDate: getDayProgressDate().startDate.toDateString(),
    endDate: getDayProgressDate().endDate.toDateString(),
    menubar: {
      shown: true,
      title: "Day",
    },
  };
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
