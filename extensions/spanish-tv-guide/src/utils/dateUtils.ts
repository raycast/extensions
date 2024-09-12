import { DateTime, Duration } from "luxon";

const TIME_ZONE = "Europe/Madrid";

const oneDay = Duration.fromObject({ day: 1 });

const getTime = (date: Date) => {
  return DateTime.fromJSDate(date).setZone(TIME_ZONE).toLocaleString(DateTime.TIME_24_SIMPLE);
};

const now = () => {
  return DateTime.now().setZone(TIME_ZONE, { keepLocalTime: true }).toJSDate();
};

const parseTime = (time: string) => {
  return DateTime.fromISO(`${currentDate()}${time}`).setZone(TIME_ZONE, { keepLocalTime: true }).toJSDate();
};

const plusOneDay = (date: Date) => {
  return DateTime.fromJSDate(date).setZone(TIME_ZONE, { keepLocalTime: true }).plus(oneDay).toJSDate();
};

const currentDate = () => now().toISOString().substring(0, 11);

export { getTime, now, parseTime, plusOneDay };
