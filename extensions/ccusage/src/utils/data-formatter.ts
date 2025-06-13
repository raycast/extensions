import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { match } from "ts-pattern";

export const formatTokens = (tokens: number | null | undefined): string => {
  if (tokens === null || tokens === undefined) return "0";

  return match(tokens)
    .when(
      (t) => t < 1000,
      (t) => t.toString(),
    )
    .when(
      (t) => t < 1000000,
      (t) => `${(t / 1000).toFixed(2)}K`,
    )
    .otherwise((t) => `${(t / 1000000).toFixed(2)}M`);
};

export const formatTokensAsMTok = (tokens: number | null | undefined): string => {
  if (tokens === null || tokens === undefined) return "0 MTok";

  const mTokens = tokens / 1000000;
  return `${mTokens.toFixed(2)} MTok`;
};

export const formatCost = (cost: number | null | undefined): string => {
  if (cost === null || cost === undefined) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost);
};

export const getTokenEfficiency = (inputTokens: number, outputTokens: number): string => {
  if (inputTokens === 0) return "N/A";
  const ratio = outputTokens / inputTokens;
  return `${ratio.toFixed(2)}x`;
};

export const getCostPerMTok = (cost: number, totalTokens: number): string => {
  if (totalTokens === 0) return "$0.00/MTok";
  const costPerMTok = (cost / totalTokens) * 1000000;
  return `$${costPerMTok.toFixed(2)}/MTok`;
};

// Timezone utilities
export const formatDateWithTimezone = (dateString: string, timezone: string = "UTC"): string => {
  // First try parseISO
  let date = parseISO(dateString);

  // If parseISO fails, try parsing as a regular date
  if (!isValid(date)) {
    date = new Date(dateString);
  }

  // If still invalid, return the original string
  if (!isValid(date)) return dateString;

  // For JST/Asia timezones, use the modern approach with Intl.DateTimeFormat
  if (timezone === "JST" || timezone.startsWith("Asia/")) {
    const targetTimezone = timezone === "JST" ? "Asia/Tokyo" : timezone;
    try {
      // Format the date in the target timezone
      const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: targetTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = formatter.formatToParts(date);
      const year = parts.find((part) => part.type === "year")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const day = parts.find((part) => part.type === "day")?.value;
      return `${year}/${month}/${day}`;
    } catch {
      // Fallback to original logic if Intl.DateTimeFormat fails
    }
  }

  // Convert to target timezone by adjusting the time (for other timezones)
  const offsetMinutes = getTimezoneOffset(timezone);
  const adjustedDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);

  return format(adjustedDate, "yyyy/MM/dd");
};

export const formatRelativeTimeWithTimezone = (dateString: string, timezone: string = "UTC"): string => {
  // First try parseISO
  let date = parseISO(dateString);

  // If parseISO fails, try parsing as a regular date
  if (!isValid(date)) {
    date = new Date(dateString);
  }

  // If still invalid, return the original string
  if (!isValid(date)) return dateString;

  // For JST/Asia timezones, calculate the proper offset
  if (timezone === "JST" || timezone.startsWith("Asia/")) {
    try {
      // Calculate the difference from the adjusted target date
      const offsetMinutes = 9 * 60; // JST offset
      const adjustedDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);

      return formatDistanceToNow(adjustedDate, { addSuffix: true });
    } catch {
      // Fallback to original logic if calculation fails
    }
  }

  // Convert to target timezone by adjusting the time (for other timezones)
  const offsetMinutes = getTimezoneOffset(timezone);
  const adjustedDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);

  return formatDistanceToNow(adjustedDate, { addSuffix: true });
};

// Simple timezone offset calculation for common timezones
const getTimezoneOffset = (timezone: string): number => {
  return (
    match(timezone)
      .with("UTC", () => 0)
      // JST shorthand
      .with("JST", () => 9 * 60) // UTC+9
      // Asia
      .with("Asia/Tokyo", () => 9 * 60) // UTC+9
      .with("Asia/Shanghai", () => 8 * 60) // UTC+8
      .with("Asia/Seoul", () => 9 * 60) // UTC+9
      .with("Asia/Hong_Kong", () => 8 * 60) // UTC+8
      .with("Asia/Singapore", () => 8 * 60) // UTC+8
      .with("Asia/Bangkok", () => 7 * 60) // UTC+7
      .with("Asia/Dubai", () => 4 * 60) // UTC+4
      .with("Asia/Kolkata", () => 5 * 60 + 30) // UTC+5:30
      // Europe
      .with("Europe/London", () => getCurrentOffset("Europe/London"))
      .with("Europe/Paris", () => getCurrentOffset("Europe/Paris"))
      .with("Europe/Berlin", () => getCurrentOffset("Europe/Berlin"))
      .with("Europe/Rome", () => getCurrentOffset("Europe/Rome"))
      .with("Europe/Amsterdam", () => getCurrentOffset("Europe/Amsterdam"))
      .with("Europe/Stockholm", () => getCurrentOffset("Europe/Stockholm"))
      .with("Europe/Moscow", () => 3 * 60) // UTC+3
      // Americas
      .with("America/New_York", () => getCurrentOffset("America/New_York"))
      .with("America/Chicago", () => getCurrentOffset("America/Chicago"))
      .with("America/Denver", () => getCurrentOffset("America/Denver"))
      .with("America/Los_Angeles", () => getCurrentOffset("America/Los_Angeles"))
      .with("America/Toronto", () => getCurrentOffset("America/Toronto"))
      .with("America/Vancouver", () => getCurrentOffset("America/Vancouver"))
      .with("America/Mexico_City", () => getCurrentOffset("America/Mexico_City"))
      .with("America/Sao_Paulo", () => getCurrentOffset("America/Sao_Paulo"))
      .with("America/Argentina/Buenos_Aires", () => -3 * 60) // UTC-3
      // Australia & Pacific
      .with("Australia/Sydney", () => getCurrentOffset("Australia/Sydney"))
      .with("Australia/Melbourne", () => getCurrentOffset("Australia/Melbourne"))
      .with("Australia/Perth", () => 8 * 60) // UTC+8
      .with("Pacific/Auckland", () => getCurrentOffset("Pacific/Auckland"))
      // Africa
      .with("Africa/Cairo", () => getCurrentOffset("Africa/Cairo"))
      .with("Africa/Johannesburg", () => 2 * 60) // UTC+2
      .otherwise(() => 0)
  );
};

// Get current offset for timezones that observe daylight saving time
const getCurrentOffset = (timezone: string): number => {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc.toLocaleString("en-US", { timeZone: timezone }));
    return Math.round((targetTime.getTime() - utc.getTime()) / (1000 * 60));
  } catch {
    return 0; // Fallback to UTC if timezone is not supported
  }
};
