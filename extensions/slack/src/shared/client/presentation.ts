import { differenceInMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import * as emoji from "node-emoji";

export function getStatusEmoji(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const converted = emoji.emojify(value);
  // Custom Slack emoji names are not image paths or Unicode emoji.
  return /:[\w+-]+:/.test(converted) ? undefined : converted;
}

export function getTimezoneMetadata(timezone: string, now = new Date()) {
  if (!timezone) return undefined;
  const local = toZonedTime(now, timezone);
  if (!Number.isFinite(local.getTime())) return undefined;
  const minutes = differenceInMinutes(local, now);
  const hours = Math.abs(minutes / 60);
  return {
    name: (timezone.split("/").pop() ?? timezone).replace(/_/g, " "),
    offset:
      minutes === 0 ? undefined : `${minutes > 0 ? "+" : "-"}${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`,
  };
}

export function parseSlackTimestamp(timestamp: string): Date {
  if (!/^\d+(?:\.\d+)?$/.test(timestamp)) return new Date(NaN);
  return new Date(Math.floor(Number(timestamp) * 1000));
}
