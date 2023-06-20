import { format, isThisYear, isBefore, formatDistance, isToday, isThisMonth } from "date-fns";

export const toDate = (value: string) =>
  new Date(value?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6.000Z"));

export const isDateOverdue = (date: Date | string | undefined) => {
  if (!date) return false;
  if (typeof date === "string") date = toDate(date);

  return isBefore(date, new Date());
};

export const fmtDate = (date: Date | string) => {
  if (typeof date === "string") date = toDate(date);
  if (isToday(date)) return "Today";
  if (isThisMonth(date)) return formatDistance(date, new Date(), { addSuffix: true });
  if (isThisYear(date)) return format(date, "dd MMM");

  return format(date, "dd MMM yyy");
};

export const getDate = (date?: Date | string) => {
  if (!date) return;
  return fmtDate(date);
};

export const dateAsString = (date?: Date, LIMIT = 10) => date && date?.toISOString().slice(0, LIMIT);
