import { preferences } from "./preferences";

const _date = new Intl.DateTimeFormat(preferences.datetimeFormat, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export const date = {
  format: (date: number | string | Date | undefined) => {
    if (typeof date === undefined) return "";

    const value = typeof date === "string" ? new Date(date) : date;
    return _date.format(value);
  },
};
