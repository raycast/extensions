import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en");

export function formatRelativeDate(inputDate: string): string {
  const date = new Date(inputDate);
  return timeAgo.format(date, "mini");
}
