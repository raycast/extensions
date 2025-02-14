import dayjs from "dayjs";

export function hasDayPassed(date: Date) {
  return Boolean(dayjs().diff(date, "day"));
}
