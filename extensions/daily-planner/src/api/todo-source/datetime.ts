const now = new Date();
export const YEAR = now.getFullYear();
export const MONTH = now.getMonth();
export const DAY = now.getDate();
export const startOfTomorrow = new Date(YEAR, MONTH, DAY + 1, 0, 0, 0, 0).getTime();
export const startOfTomorrowUTC = Date.UTC(YEAR, MONTH, DAY + 1, 0, 0, 0, 0);

// Returns a `Date` that has the same date and time components in local time zone as the given date's in UTC.
export const utcToLocal = (d: Date) =>
  new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );

// Returns the time value of a `Date` that has the same date and time components in UTC as the given date's in local time zone.
export const localToUTC = (d: Date) =>
  Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  );
