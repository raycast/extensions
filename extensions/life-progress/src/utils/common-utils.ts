import { commandMetadata, progressSymbol, weekStart } from "../types/preferences";
import { LifeProgress } from "../types/types";
import { updateCommandMetadata } from "@raycast/api";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const getCanvasSymbols = (titleProgressBar = false) => {
  let spentSymbol = "■";
  let leftSymbol = "□";
  let symbolNum = 40;
  switch (progressSymbol) {
    case "■": {
      spentSymbol = "■";
      leftSymbol = "□";
      symbolNum = titleProgressBar ? 52 : symbolNum;
      break;
    }
    case "●": {
      spentSymbol = "●";
      leftSymbol = "○";
      symbolNum = titleProgressBar ? 52 : symbolNum;
      break;
    }
    case "♥︎": {
      spentSymbol = "♥︎︎";
      leftSymbol = "♡";
      symbolNum = titleProgressBar ? 47 : symbolNum;
      break;
    }
    case "✿": {
      spentSymbol = "✿︎";
      leftSymbol = "❀";
      symbolNum = titleProgressBar ? 59 : symbolNum;
      break;
    }
    case "★": {
      spentSymbol = "★";
      leftSymbol = "☆";
      symbolNum = titleProgressBar ? 46 : symbolNum;
      break;
    }
    case "✪": {
      spentSymbol = "✪";
      leftSymbol = "○";
      symbolNum = titleProgressBar ? 55 : symbolNum;
      break;
    }
    case "✔": {
      spentSymbol = "✔︎";
      leftSymbol = "✘";
      symbolNum = titleProgressBar ? 66 : symbolNum;
      break;
    }
    case "⚉": {
      spentSymbol = "⚉";
      leftSymbol = "⚇";
      symbolNum = titleProgressBar ? 80 : symbolNum;
      break;
    }
    case "☀︎": {
      spentSymbol = "☀︎";
      leftSymbol = "☼";
      symbolNum = titleProgressBar ? 45 : symbolNum;
      break;
    }
    case "❄︎": {
      spentSymbol = "❄︎︎︎︎";
      leftSymbol = "☃︎";
      symbolNum = titleProgressBar ? 48 : symbolNum;
      break;
    }
    default:
      break;
  }
  return { spentSymbol: spentSymbol, leftSymbol: leftSymbol, titleSymbolNum: symbolNum };
};

export const getLiftProgressCanvas = (
  spentTime: number,
  leftTime: number,
  symbolNum: number,
  titleProgressBar = false,
) => {
  const { spentSymbol, leftSymbol, titleSymbolNum } = getCanvasSymbols(titleProgressBar);
  const finalSymbolNum = titleProgressBar ? titleSymbolNum : symbolNum;

  const canvas =
    spentSymbol.repeat(Math.floor((spentTime / (spentTime + leftTime)) * finalSymbolNum)) +
    leftSymbol.repeat(finalSymbolNum - Math.floor((spentTime / (spentTime + leftTime)) * finalSymbolNum));
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
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[6].number, 24, false).canvas;
      subtitleStrAll = "It's now " + currentTime();
      break;
    }
    case "Week": {
      const { daysSinceWeekStart, daysLeftInWeek } = getWeekStatus(weekStart);
      subtitleStrSpent = daysSinceWeekStart;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, daysLeftInWeek, 7, false).canvas;
      subtitleStrAll = currentWeek();
      break;
    }
    case "Month": {
      const days = daysInCurrentMonth();
      subtitleStrSpent = days - lifeProgresses[8].number;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[8].number, days, false).canvas;
      subtitleStrAll = currentMonth();
      break;
    }
    case "Year": {
      const years = daysInCurrentYear();
      subtitleStrSpent = years - lifeProgresses[9].number;
      subtitleIcon = getLiftProgressCanvas(subtitleStrSpent, lifeProgresses[9].number, 24, false).canvas;
      subtitleStrAll = "Today is day " + subtitleStrSpent.toString();
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

const currentWeek = () => {
  const date = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

const currentMonth = () => {
  const date = new Date();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth();

  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${monthNames[monthIndex]} ${day}${suffix}`;
};
