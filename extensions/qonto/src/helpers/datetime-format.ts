import { preferences } from "./preferences";

const _datetime = new Intl.DateTimeFormat(preferences.datetimeFormat, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

export const datetime = {
  format: (date: number | string | Date | undefined) => {
    const value = typeof date === "string" ? new Date(date) : date;
    return _datetime.format(value);
  },
};
