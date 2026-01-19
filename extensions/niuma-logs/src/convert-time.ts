import dayjs from "dayjs";
import { getStrings } from "./i18n";

export default function convertTime(
  dateTime: string | number | Date | undefined,
) {
  if (!dateTime) return "";
  const { time } = getStrings();
  const currentTime = dayjs();
  const oldTime = dayjs(dateTime);

  const diffMonths = currentTime.diff(oldTime, "month");
  const diffWeeks = currentTime.diff(oldTime, "week");
  const diffDays = currentTime.diff(oldTime, "day");
  const diffHours = currentTime.diff(oldTime, "hour");
  const diffMinutes = currentTime.diff(oldTime, "minute");

  if (diffMonths >= 1 && diffMonths < 4) {
    return time.monthsAgo(diffMonths);
  }
  if (diffWeeks >= 1 && diffWeeks < 4) {
    return time.weeksAgo(diffWeeks);
  }
  if (diffDays >= 1 && diffDays < 7) {
    return time.daysAgo(diffDays);
  }
  if (diffHours >= 1 && diffHours < 24) {
    return time.hoursAgo(diffHours);
  }
  if (diffMinutes >= 1 && diffMinutes < 60) {
    return time.minutesAgo(diffMinutes);
  }
  if (diffMinutes >= 0 && diffMinutes < 1) {
    return time.justNow;
  }
  return dayjs(dateTime).format("YYYY-MM-DD");
}
