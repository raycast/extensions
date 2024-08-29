import { useContext } from "react";
import { Context } from "u/context";

export const getTitle = () => {
  const { currentMonth, currentDay, currentYear } = useContext(Context);

  const date = new Date(currentYear, currentMonth - 1, currentDay);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

  return formattedDate;
};
