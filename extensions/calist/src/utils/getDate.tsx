import { weekNumber } from "weeknumber";

export function getCurrentMonth() {
  const now = new Date();
  return {
    monthNumber: now.getMonth() + 1,
    monthNumberAsString: (now.getMonth() + 1).toString(),
    monthStringLong: now.toLocaleString(undefined, { month: "long" }),
    monthStringShort: now.toLocaleString(undefined, { month: "short" }),
  };
}

export function getAllMonthsOfYear() {
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(0, i); // 0 represents 1970, but only the month is relevant here
    return {
      monthNumber: i + 1,
      monthNumberAsString: (i + 1).toString(),
      monthStringLong: date.toLocaleString(undefined, { month: "long" }),
      monthStringShort: date.toLocaleString(undefined, { month: "short" }),
    };
  });

  return months;
}

export function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7);
  return weekNo;
}

export function getCurrentWeek() {
  const now = new Date();
  return weekNumber(now);
}

export const getMonthName = (monthNumber: number) => {
  const date = new Date();
  date.setMonth(monthNumber);
  return date.toLocaleString("default", { month: "long" });
};

export function getCurrentYear() {
  const now = new Date();
  return now.getFullYear();
}

export function getCurrentDay() {
  const now = new Date();
  const optionsLong: Intl.DateTimeFormatOptions = { weekday: "long" };
  const optionsShort: Intl.DateTimeFormatOptions = { weekday: "short" };

  return {
    dayNumber: now.getDay(),
    dayStringLong: now.toLocaleDateString(undefined, optionsLong),
    dayStringShort: now.toLocaleDateString(undefined, optionsShort),
  };
}
