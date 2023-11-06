import { DateTime, Duration } from "luxon";

const TIME_ZONE = "Europe/Madrid";

const oneDay = Duration.fromObject({ day: 1 });
const currentDate = () => now().toISOString().substring(0, 11);

const getTime = (date: Date) => DateTime.fromJSDate(date, { zone: TIME_ZONE }).toLocaleString(DateTime.TIME_24_SIMPLE);
const now = () => DateTime.now().setZone(TIME_ZONE).toJSDate();
const parseTime = (time: string) => DateTime.fromISO(`${currentDate()}${time}`, { zone: TIME_ZONE }).toJSDate();
const plusOneDay = (date: Date) => DateTime.fromJSDate(date, { zone: TIME_ZONE }).plus(oneDay).toJSDate();

export { getTime, now, parseTime, plusOneDay };
