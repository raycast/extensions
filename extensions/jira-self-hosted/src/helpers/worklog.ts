import { format } from "date-fns";

/** Jira Server-style datetime with offset, e.g. 2011-07-05T11:05:00.000+0100 */
export function formatJiraStarted(date: Date): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  const tzo = -date.getTimezoneOffset();
  const sign = tzo >= 0 ? "+" : "-";
  const abs = Math.abs(tzo);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS")}${sign}${pad2(hours)}${pad2(minutes)}`;
}

/**
 * Parse duration like "2h 15m 30s" (order-free, case-insensitive) into seconds.
 * Returns null if empty, invalid, or total is zero.
 */
export function parseJiraTimeSpentToSeconds(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) {
    return null;
  }

  const re = /(\d+)\s*([hms])/g;
  let total = 0;
  let matched = false;
  for (const m of s.matchAll(re)) {
    matched = true;
    const n = parseInt(m[1], 10);
    if (m[2] === "h") {
      total += n * 3600;
    } else if (m[2] === "m") {
      total += n * 60;
    } else {
      total += n;
    }
  }

  if (!matched || total <= 0) {
    return null;
  }

  const withoutUnits = s.replace(re, "");
  if (withoutUnits.replace(/\s/g, "").length > 0) {
    return null;
  }

  return total;
}
