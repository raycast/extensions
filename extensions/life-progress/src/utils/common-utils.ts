import { commandMetadata, progressSymbol, weekStart } from "../types/preferences";
import { LifeProgress } from "../types/types";
import { updateCommandMetadata } from "@raycast/api";

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

export const updateCommandSubtitle = async (lifeProgresses: LifeProgress[]) => {
  let subtitleStrSpent = 0;
  let subtitleStrAll = "";
  let subtitleIcon = "";

  switch (commandMetadata) {
    case "Day": {
      subtitleStrSpent = 24 - lifeProgresses[6].number - 1;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[6].number, 11).canvas;
      subtitleStrAll = currentDate() + "  " + currentTime();
      break;
    }
    case "Week": {
      const { daysSinceWeekStart, daysLeftInWeek } = getWeekStatus(weekStart);
      subtitleStrSpent = daysSinceWeekStart;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, daysLeftInWeek, 7).canvas;
      subtitleStrAll = currentDate();
      break;
    }
    case "Month": {
      const days = daysInCurrentMonth();
      subtitleStrSpent = days - lifeProgresses[8].number;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[8].number, 10).canvas;
      subtitleStrAll = currentDate();
      break;
    }
    case "Year": {
      const years = daysInCurrentYear();
      subtitleStrSpent = years - lifeProgresses[9].number;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[9].number, 12).canvas;
      subtitleStrAll = currentDate() + `  Day ${subtitleStrSpent} of the year`;
      break;
    }
  }
  await updateCommandMetadata({
    subtitle: subtitleIcon + "  " + subtitleStrAll,
  });
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

const currentTime = () => {
  const date = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const currentDate = () => {
  const date = new Date();
  const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  return weekDayShort + " " + currentMonth();
};

const currentMonth = () => {
  const date = new Date();
  const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  return `${monthShort} ${date.getDate()} ${date.getFullYear()}`;
};
