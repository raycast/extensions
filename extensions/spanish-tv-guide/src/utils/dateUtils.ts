import { DateTime } from "luxon";
import { isString } from "./stringUtils";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;

const now = () => new Date();

const getTime = (date: Date) => {
  return DateTime.fromJSDate(date).toLocaleString(DateTime.TIME_24_SIMPLE);
};

const dateReviver = (_: string, value: unknown) => {
  return isSerializedISODate(value) ? DateTime.fromISO(value).toJSDate() : value;
};

const isSerializedISODate = (value: unknown): value is string => isString(value) && ISO_DATE_PATTERN.test(value);

export { dateReviver, getTime, now };
