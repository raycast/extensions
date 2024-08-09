import { icon, weekStart } from "../types/preferences";
import { weekNumber, weekNumberSat, weekNumberSun } from "weeknumber";
import { Icon } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getWeekNumber = (date: Date = new Date()) => {
  switch (weekStart) {
    case "Sunday":
      return weekNumberSun(date).toString();
    case "Saturday":
      return weekNumberSat(date).toString();
    default:
      return weekNumber(date).toString();
  }
};

function getTodayPercentageOfYear(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

  const daysInYear = (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  const daysPassed = (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);

  return daysPassed / daysInYear;
}

function getNumberIcon(num: number) {
  if (num < 10) {
    return `number-0${num}-16` as Icon;
  } else {
    return `number-${num}-16` as Icon;
  }
}

export const getWeekNumberIcon = () => {
  if (icon === "number-16") {
    return getNumberIcon(parseInt(getWeekNumber()));
  } else if (icon === "progress") {
    return {
      source: {
        light: getProgressIcon(getTodayPercentageOfYear(), "#000000", {
          background: "#000000",
          backgroundOpacity: 0.15,
        }),
        dark: getProgressIcon(getTodayPercentageOfYear(), "#ffffff", {
          background: "#ffffff",
          backgroundOpacity: 0.25,
        }),
      },
    };
  } else {
    return icon ? (icon as Icon) : undefined;
  }
};
