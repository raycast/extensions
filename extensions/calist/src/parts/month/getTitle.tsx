import { useContext } from "react";
import { Context } from "u/context";
import { getDayName, getMonthName, getDayNameAll } from "u/getName";
import { weekDays, monthName } from "u/options";

export const getTitle = () => {
  const { currentDay, enableWeek } = useContext(Context);
  const dayNames = getDayNameAll();
  const space = " ".repeat(enableWeek ? 18 : 21);

  const dayNamesString = dayNames.join(space);
  const weekPrefix = enableWeek ? "Week".padEnd(18) : "";

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
