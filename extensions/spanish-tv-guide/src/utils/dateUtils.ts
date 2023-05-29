import { DateTime, Interval } from "luxon";

const TIME_ZONE = "Europe/Madrid";

const parseDate = (date: string) => DateTime.fromISO(date, { zone: TIME_ZONE }).toJSDate();
const getTime = (date: Date) => DateTime.fromJSDate(date).toLocaleString(DateTime.TIME_24_SIMPLE);
const isActiveInterval = (from: Date, to: Date) => Interval.fromDateTimes(from, to).contains(DateTime.now());

export { getTime, isActiveInterval, parseDate };
