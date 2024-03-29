import { getCurrentDateTimeForTz } from "./getCurrentDateTimeForTz";

export function getOffsetForTz(tz: string): string {
  const tzDateString = getCurrentDateTimeForTz(tz);
  const localDateString = getCurrentDateTimeForTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const tzDate = new Date(tzDateString);
  const localDate = new Date(localDateString);
  const diff = tzDate.getTime() - localDate.getTime();
  const offset = Math.floor(diff / 3600000);

  return offset === 0
    ? "has the same time"
    : offset > 0
      ? `is ${offset} hours ahead`
      : `is ${offset * -1} hour(s) behind`;
}
