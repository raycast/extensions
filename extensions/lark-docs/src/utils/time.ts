import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import RelativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(LocalizedFormat);
dayjs.extend(RelativeTime);

export function formatRelativeTime(unixSeconds: number): string {
  if (!unixSeconds) return "";
  return dayjs.unix(unixSeconds).fromNow(false);
}

export function formatFullTime(unixSeconds: number): string {
  if (!unixSeconds) return "";
  return dayjs.unix(unixSeconds).format("lll");
}
