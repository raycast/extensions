import { DateTime, SystemZone } from "luxon";
import { isString } from "./stringUtils";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;
const systemZone = SystemZone.instance;

const now = () => DateTime.now().setZone(systemZone).toJSDate();

const getTime = (date: Date) => {
  return DateTime.fromJSDate(date, { zone: systemZone.name }).toLocaleString(DateTime.TIME_24_SIMPLE);
};

const dateReviver = (_: string, value: unknown) => {
  if (isSerializedISODate(value)) {
    return DateTime.fromISO(value).toJSDate();
  }
  return value;
};

const isSerializedISODate = (value: unknown): value is string => isString(value) && ISO_DATE_PATTERN.test(value);

export { dateReviver, getTime, now };
