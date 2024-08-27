import { useContext } from "react";
import { Context } from "u/context";
import { getDayName, getMonthName } from "u/getName";
import { weekDays, monthName, weekEnable } from "u/options";

export const getTitle = () => {
  const { currentDay } = useContext(Context);

  if (monthName && !weekEnable) {
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
