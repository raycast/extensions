import { colorIcon, commandMetadata, hour24, progressSymbol, showTitle, weekStart } from "../types/preferences";
import { LifeProgressType } from "../types/types";
import { Color, updateCommandMetadata } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const getCanvasSymbols = () => {
  let spentSymbol = "■";
  let leftSymbol = "□";
  switch (progressSymbol) {
    case "■": {
      spentSymbol = "■";
      leftSymbol = "□";
      break;
    }
    case "●": {
      spentSymbol = "●";
      leftSymbol = "○";
      break;
    }
    case "♥︎": {
      spentSymbol = "♥︎︎";
      leftSymbol = "♡";
      break;
    }
    case "✿": {
      spentSymbol = "✿︎";
      leftSymbol = "❀";
      break;
    }
    case "★": {
      spentSymbol = "★";
      leftSymbol = "☆";
      break;
    }
    case "✪": {
      spentSymbol = "✪";
      leftSymbol = "○";
      break;
    }
    default:
      break;
  }
  return { spentSymbol: spentSymbol, leftSymbol: leftSymbol };
};

export const getLiftProgressCanvas = (spentTime: number, leftTime: number, symbolNum: number) => {
  const { spentSymbol, leftSymbol } = getCanvasSymbols();

  const canvas =
    spentSymbol.repeat(Math.floor((spentTime / (spentTime + leftTime)) * symbolNum)) +
    leftSymbol.repeat(symbolNum - Math.floor((spentTime / (spentTime + leftTime)) * symbolNum));
  const text = ((spentTime / (spentTime + leftTime)) * 100).toFixed(0) + "%";
  return { canvas: canvas, text: text };
};

export const updateCommandSubtitle = async () => {
  await updateCommandMetadata({
    subtitle: "Life Progress",
  });
};

const buildMenubarIcon = (progress: number) => {
  const color = (progress: number) => {
    if (progress < 0.1) {
      return Color.Purple;
    } else if (progress < 0.35) {
      return Color.Blue;
    } else if (progress < 0.5) {
      return Color.Green;
    } else if (progress < 0.65) {
      return Color.Yellow;
    } else if (progress < 0.8) {
      return Color.Orange;
    } else if (progress < 0.95) {
      return Color.Magenta;
    } else {
      return Color.Red;
    }
  };
  return {
    source: {
      light: getProgressIcon(progress, colorIcon ? color(progress) : "#000000", {
        background: "#000000",
        backgroundOpacity: 0.15,
      }),
      dark: getProgressIcon(progress, colorIcon ? color(progress) : "#ffffff", {
        background: "#ffffff",
        backgroundOpacity: 0.25,
      }),
    },
  };
};

export const buildMenubarContent = (lifeProgresses: LifeProgressType[]) => {
  if (!lifeProgresses || lifeProgresses.length === 0) {
    return undefined;
  }
  const progressList = [];
  let menuBarInfo;

  const hourOfDay = 24 - lifeProgresses[6].number - 1;
  const dayItem = {
    icon: buildMenubarIcon(hourOfDay / 24),
    progress: hourOfDay + "/" + "24",
    title: "Hour of Day",
  };

  const { daysLeftInWeek } = getWeekStatus(weekStart);
  const dayOfWeek = 7 - daysLeftInWeek;
  const weekItem = {
    icon: buildMenubarIcon(dayOfWeek / 7),
    progress: dayOfWeek + "/" + "7",
    title: "Day of Week",
  };

  const daysInMonth = daysInCurrentMonth();
  const dayOfMonth = daysInMonth - lifeProgresses[8].number;
  const monthItem = {
    icon: buildMenubarIcon(dayOfMonth / daysInMonth),
    progress: dayOfMonth + "/" + daysInMonth,
    title: "Day of Month",
  };

  const daysInYear = daysInCurrentYear();
  const dayOfYear = daysInYear - lifeProgresses[9].number;
  const yearItem = {
    icon: buildMenubarIcon(dayOfYear / daysInYear),
    progress: dayOfYear + "/" + daysInYear,
    title: "Day of Year",
  };

  progressList.push(dayItem);
  progressList.push(weekItem);
  progressList.push(monthItem);
  progressList.push(yearItem);
  switch (commandMetadata) {
    case "Day": {
      menuBarInfo = dayItem;
      break;
    }
    case "Week": {
      menuBarInfo = weekItem;
      break;
    }
    case "Month": {
      menuBarInfo = monthItem;
      break;
    }
    case "Year": {
      menuBarInfo = yearItem;
      break;
    }
  }
  if (!showTitle) {
    menuBarInfo.title = "";
  }

  return { menuBarInfo, progressList };
};

interface WeekStatus {
  daysSinceWeekStart: number;
  daysLeftInWeek: number;
}

function getWeekStatus(weekStartDay: string = "Monday"): WeekStatus {
  const dayMapping: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  if (!Object.prototype.hasOwnProperty.call(dayMapping, weekStartDay)) {
    throw new Error(
      "Invalid week start day. It should be one of 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'.",
    );
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  const weekStartDayNumber = dayMapping[weekStartDay];

  const daysSinceWeekStart = ((dayOfWeek - weekStartDayNumber + 7) % 7) + 1;
  const daysLeftInWeek = 6 - daysSinceWeekStart + 1;

  return {
    daysSinceWeekStart,
    daysLeftInWeek,
  };
}

const daysInCurrentMonth = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
  const lastDayOfCurrentMonth = new Date(firstDayOfNextMonth.getTime() - 24 * 60 * 60 * 1000);
  return lastDayOfCurrentMonth.getDate();
};

const isLeapYear = (year: number) => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

const daysInCurrentYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  return isLeapYear(currentYear) ? 366 : 365;
};

export const currentTime = () => {
  const date = new Date();
  if (hour24) {
    // 24-hour format
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } else {
    // 12-hour format
    const hours = date.getHours() % 12 || 12; // Convert 0 to 12 for 12 AM
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = date.getHours() >= 12 ? "PM" : "AM";
    return `${hours}:${minutes} ${period}`;
  }
};

export const currentDate = () => {
  const date = new Date();
  const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  return weekDayShort + " " + currentMonth();
};

const currentMonth = () => {
  const date = new Date();
  const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  return `${monthShort} ${date.getDate()} ${date.getFullYear()}`;
};
