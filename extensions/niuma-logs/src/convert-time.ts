import dayjs from "dayjs";

const timeStrings = {
  monthsAgo: (count: number) => `${count} months ago`,
  weeksAgo: (count: number) => `${count} weeks ago`,
  daysAgo: (count: number) => `${count} days ago`,
  hoursAgo: (count: number) => `${count} hours ago`,
  minutesAgo: (count: number) => `${count} minutes ago`,
  justNow: "just now",
};

export default function convertTime(
  dateTime: string | number | Date | undefined,
) {
  if (!dateTime) return "";
  const currentTime = dayjs();
  const oldTime = dayjs(dateTime);

  const diffMonths = currentTime.diff(oldTime, "month");
  const diffWeeks = currentTime.diff(oldTime, "week");
  const diffDays = currentTime.diff(oldTime, "day");
  const diffHours = currentTime.diff(oldTime, "hour");
  const diffMinutes = currentTime.diff(oldTime, "minute");

  if (diffMonths >= 1 && diffMonths < 4) {
    return timeStrings.monthsAgo(diffMonths);
  }
  if (diffWeeks >= 1 && diffWeeks < 4) {
    return timeStrings.weeksAgo(diffWeeks);
  }
  if (diffDays >= 1 && diffDays < 7) {
    return timeStrings.daysAgo(diffDays);
  }
  if (diffHours >= 1 && diffHours < 24) {
    return timeStrings.hoursAgo(diffHours);
  }
  if (diffMinutes >= 1 && diffMinutes < 60) {
    return timeStrings.minutesAgo(diffMinutes);
  }
  if (diffMinutes >= 0 && diffMinutes < 1) {
    return timeStrings.justNow;
  }
  return dayjs(dateTime).format("YYYY-MM-DD");
}
