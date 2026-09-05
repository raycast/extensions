export type TimestampUnit = "seconds" | "milliseconds";

export type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const MAX_DATE_MILLISECONDS = 8.64e15;

export function timestampFromMilliseconds(
  milliseconds: number,
  unit: TimestampUnit,
) {
  return unit === "seconds"
    ? Math.floor(milliseconds / 1000).toString()
    : Math.floor(milliseconds).toString();
}

export function parseTimestamp(raw: string, unit: TimestampUnit) {
  const value = raw.trim();
  if (!value) throw new Error("Enter a timestamp");
  if (!/^-?\d+(?:\.\d+)?$/.test(value))
    throw new Error("The timestamp must be a number");

  const numeric = Number(value);
  const milliseconds = unit === "seconds" ? numeric * 1000 : numeric;
  if (
    !Number.isFinite(milliseconds) ||
    Math.abs(milliseconds) > MAX_DATE_MILLISECONDS
  ) {
    throw new Error("The timestamp is outside the supported date range");
  }
  return milliseconds;
}

export function formatInTimeZone(
  milliseconds: number,
  timeZone: string,
  includeMilliseconds: boolean,
) {
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime()))
    throw new Error("Unable to parse this timestamp");

  const parts = getParts(date, timeZone);
  const dateTime = `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
  return includeMilliseconds
    ? `${dateTime}.${pad(date.getUTCMilliseconds(), 3)}`
    : dateTime;
}

export function dateToWallClockParts(date: Date): DateTimeParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
  };
}

export function formatWallClockParts(parts: DateTimeParts) {
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}`;
}

export function parseDateTimeText(raw: string): DateTimeParts {
  const value = raw.trim();
  if (!value) throw new Error("Enter a date and time");

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
  );
  if (!match) {
    throw new Error("Use the format YYYY-MM-DD HH:mm:ss");
  }

  const parts: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    millisecond: Number((match[7] || "0").padEnd(3, "0")),
  };
  const daysInMonth = new Date(
    Date.UTC(parts.year, parts.month, 0),
  ).getUTCDate();
  const valid =
    parts.year >= 1000 &&
    parts.month >= 1 &&
    parts.month <= 12 &&
    parts.day >= 1 &&
    parts.day <= daysInMonth &&
    parts.hour >= 0 &&
    parts.hour <= 23 &&
    parts.minute >= 0 &&
    parts.minute <= 59 &&
    parts.second >= 0 &&
    parts.second <= 59;

  if (!valid) throw new Error("Enter a valid date and time");
  return parts;
}

export function wallClockToMilliseconds(
  parts: DateTimeParts,
  timeZone: string,
) {
  const target = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
  let result = target;

  // The offset can change near a daylight-saving boundary, so refine the result.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getParts(new Date(result), timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      parts.millisecond,
    );
    const adjustment = target - actualAsUtc;
    if (adjustment === 0) break;
    result += adjustment;
  }

  const verified = getParts(new Date(result), timeZone);
  const matches =
    verified.year === parts.year &&
    verified.month === parts.month &&
    verified.day === parts.day &&
    verified.hour === parts.hour &&
    verified.minute === parts.minute &&
    verified.second === parts.second;

  if (!matches)
    throw new Error(
      "This local time does not exist in the selected time zone because of a daylight-saving transition",
    );
  return result;
}

function getParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function pad(value: number, length = 2) {
  return value.toString().padStart(length, "0");
}
