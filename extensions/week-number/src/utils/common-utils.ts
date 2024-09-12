import { icon, weekStart } from "../types/preferences";
import { weekNumber, weekNumberSat, weekNumberSun } from "weeknumber";
import { Icon } from "@raycast/api";
import { numberArray } from "./constants";

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

export const getWeekNumberIcon = () => {
  if (icon === "number-16") {
    return numberArray[parseInt(getWeekNumber())];
  } else {
    return icon ? (icon as Icon) : undefined;
  }
};
