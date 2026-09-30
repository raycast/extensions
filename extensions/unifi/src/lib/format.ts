import { format, formatDuration, intervalToDuration } from "date-fns";
import { getUniFiPreferences } from "../api/preferences";

export function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, getUniFiPreferences().dateFormat || "yyyy-MM-dd HH:mm:ss");
}

export function formatDurationSeconds(seconds?: number): string | undefined {
  if (seconds === undefined) return undefined;
  return (
    formatDuration(intervalToDuration({ start: 0, end: Math.max(0, seconds) * 1000 }), {
      format: ["days", "hours", "minutes", "seconds"],
    }) || "0 seconds"
  );
}

export function formatBitsPerSecond(value?: number): string | undefined {
  if (value === undefined) return undefined;
  const units = ["bps", "Kbps", "Mbps", "Gbps"];
  let amount = value;
  let unit = 0;
  while (amount >= 1000 && unit < units.length - 1) {
    amount /= 1000;
    unit += 1;
  }
  return `${amount >= 100 || Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)} ${units[unit]}`;
}

export function formatMegabitsPerSecond(value?: number): string {
  if (!value) return "Inactive";
  return value >= 1000 ? `${Number((value / 1000).toFixed(1))} Gbps` : `${value} Mbps`;
}
