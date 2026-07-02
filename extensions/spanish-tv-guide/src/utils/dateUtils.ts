import { execSync } from "child_process";
import { DateTime } from "luxon";
import { isString } from "./stringUtils";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;
const TIMEZONE = "Europe/Madrid";

const getSystemTimezone = (): string => {
  try {
    const output = execSync("readlink /etc/localtime", { encoding: "utf-8" }).trim();
    const match = output.match(/zoneinfo\/(.+)$/);
    if (match) return match[1];
  } catch {
    // fall through to Intl fallback
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? TIMEZONE;
};

const systemTimezone = getSystemTimezone();

const now = () => new Date();

const getTime = (date: Date) => {
  return DateTime.fromJSDate(date, { zone: systemTimezone }).toLocaleString(DateTime.TIME_24_SIMPLE);
};

const dateReviver = (_: string, value: unknown) => {
  if (isSerializedISODate(value)) {
    return DateTime.fromISO(value.replace(/Z$/, ""), { zone: TIMEZONE }).toJSDate();
  }
  return value;
};

const isSerializedISODate = (value: unknown): value is string => isString(value) && ISO_DATE_PATTERN.test(value);

export { dateReviver, getTime, now };
