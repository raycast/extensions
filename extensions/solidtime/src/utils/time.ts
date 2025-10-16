import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.extend(duration);

export const djs = dayjs;

export function getTimeStamp(): string {
  // Remove milliseconds
  return djs().toISOString().slice(0, -5) + "Z";
}
