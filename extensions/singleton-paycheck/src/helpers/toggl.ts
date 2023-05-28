import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import Preferences from "../types/Preferences";
import TogglLoggedEntry from "../types/TogglLoggedEntry";
import moment from "moment";

const startOfMonth = ((date) => {
  const firstDay = new Date(
    new Date(date.getFullYear(), date.getMonth(), 1).getTime() -
      date.getTimezoneOffset() * 60000
  );
  return firstDay.toISOString().split("T")[0];
})(new Date());

const endOfMonth = ((date) => {
  // 86400 is one day in seconds
  const firstDay = new Date(
    new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() -
      date.getTimezoneOffset() * 60000
  );
  return firstDay.toISOString().split("T")[0];
})(new Date());

const startOfDay = ((date) => {
  const firstDay = new Date(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      date.getTimezoneOffset() * 60000
  );
  return firstDay.toISOString().split("T")[0];
})(new Date());

const endOfDay = ((date) => {
  const firstDay = new Date(
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1
    ).getTime() -
      date.getTimezoneOffset() * 60000
  );
  return firstDay.toISOString().split("T")[0];
})(new Date());

const getBusinessDaysInMonth = ((year, month) =>
  new Array(32 - new Date(year, month, 32).getDate())
    .fill(1)
    .filter(
      (id, index) =>
        [0, 6].indexOf(new Date(year, month, index + 1).getDay()) === -1
    ).length)(new Date().getFullYear(), new Date().getMonth());

const getBusinessDaysUntilNow = ((date) => {
  const firstDay = new Date(
    new Date(date.getFullYear(), date.getMonth(), 1).getTime() -
      date.getTimezoneOffset() * 60000
  );
  const daysUntilNow = Math.ceil(
    (date.getTime() - firstDay.getTime()) / (1000 * 3600 * 24)
  );
  return new Array(daysUntilNow)
    .fill(1)
    .filter(
      (id, index) =>
        [0, 6].indexOf(
          new Date(date.getFullYear(), date.getMonth(), index + 1).getDay()
        ) === -1
    ).length;
})(new Date());

const getBusinessDaysUntilEndOfMonth = ((date) => {
  const lastDay = new Date(
    new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime() -
      date.getTimezoneOffset() * 60000
  );
  const daysUntilEndOfMonth = Math.ceil(
    (lastDay.getTime() - date.getTime()) / (1000 * 3600 * 24)
  );
  const businessDays = new Array(daysUntilEndOfMonth)
    .fill(1)
    .filter(
      (id, index) =>
        [0, 6].indexOf(
          new Date(date.getFullYear(), date.getMonth(), index + 1).getDay()
        ) === -1
    ).length;

  // If current day is a business day, add it to the total
  if (date.getDay() !== 0 && date.getDay() !== 6) {
    return businessDays + 1;
  }

  return businessDays;
})(new Date());

const startOfWeek = ((date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);

  date.setDate(diff);

  return date.toISOString().split("T")[0];
})(new Date());

const endOfWeek = ((date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? 0 : +7);

  date.setDate(diff);

  return date.toISOString().split("T")[0];
})(new Date());

const getTotalSeconds = (entries: Array<TogglLoggedEntry>) => {
  return entries.reduce((sum, current) => {
    const isRunning = current.duration < 0;

    if (isRunning) {
      // Convert from negative unix timestamp to actual date object
      const date = moment((current.duration as number) * -1 * 1000);
      const currentDate = moment();

      // Resulting calculation is in milliseconds, so divide by 1000 to get seconds
      const runningSeconds = (currentDate.valueOf() - date.valueOf()) / 1000;

      return sum + runningSeconds;
    } else {
      return sum + current.duration;
    }
  }, 0);
};

const requestEntries = async (
  requestUrl: string
): Promise<TogglLoggedEntry[]> => {
  const { togglApiKey } = getPreferenceValues<Preferences>();
  const token = Buffer.from(`${togglApiKey}:api_token`).toString("base64");

  const togglHeaders = {
    "Content-Type": "application/json",
    Authorization: `Basic ${token}`,
  };

  const response = await fetch(requestUrl, { headers: togglHeaders });
  const parsedRequest = await response.json();

  return parsedRequest as TogglLoggedEntry[];
};

export {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  getBusinessDaysInMonth,
  getBusinessDaysUntilNow,
  getBusinessDaysUntilEndOfMonth,
  getTotalSeconds,
  requestEntries,
};
