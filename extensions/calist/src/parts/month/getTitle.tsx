import { useContext } from "react";
import { Context } from "u/context";
import { getDayName, getMonthName, getDayNameAll } from "u/getName";
import { weekDays, monthName } from "u/options";
import { environment } from "@raycast/api";

export const getTitle = () => {
  const { currentDay, enableWeek } = useContext(Context);
  const dayNames = getDayNameAll();
  const fontSize = environment.textSize;
  const spaceCount = fontSize === "medium" ? (enableWeek ? 21 : 25) : enableWeek ? 18 : 21;
  const space = " ".repeat(spaceCount);
  const dayNamesString = dayNames.join(space);
  const paddingSize = fontSize === "medium" ? 22 : 18;
  const weekPrefix = enableWeek ? "Week".padEnd(paddingSize) : "";

  if (weekDays) {
    return weekPrefix + dayNamesString;
  }

  if (monthName) {
    return `${getDayName(currentDay)} ${currentDay}`;
  }

  return undefined;
};

export const getSubTitle = () => {
  const { currentYear, currentMonth } = useContext(Context);

  if (!weekDays && monthName) {
    return `${getMonthName(currentMonth)} ${currentYear}`;
  }

  return "";
};
