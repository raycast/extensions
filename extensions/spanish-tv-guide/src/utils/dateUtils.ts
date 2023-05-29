import { DateTime } from "luxon";

const TIME_ZONE = "Europe/Madrid";

const parseDate = (date: string) => DateTime.fromISO(date, { zone: TIME_ZONE }).toJSDate();
const getTime = (date: Date) => DateTime.fromJSDate(date).toLocaleString(DateTime.TIME_24_SIMPLE);

export { getTime, parseDate };
