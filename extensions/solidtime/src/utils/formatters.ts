import type { Dayjs } from "dayjs";
import type { Duration } from "dayjs/plugin/duration.js";
import { useMembership } from "./membership.js";
import { djs } from "./time.js";

/**
 * For now raycast only supports US english
 * https://developers.raycast.com/basics/prepare-an-extension-for-store#localization-language
 */
const LOCALE = "en-US";

export function formatCurrency(value: number, currency?: string): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currency,
    style: "currency",
  }).format(value);
}

export function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

export function formatDuration(duration: Duration): string {
  // Intl.Duration not supported for now in node
  // https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Intl/DurationFormat#browser-kompatibilit%C3%A4t
  return (
    duration
      // Add an empty second, otherwise it won't format correctly, and only show a lot of seconds.
      .add(0, "s")
      .format("D[d] H[h] m[m] s[s]")
      // Remove zero items
      .replace(/0[a-z]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function formatDate(date: Date | string | Dayjs): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "long" }).format(djs(date).toDate());
}
export function formatTime(date: Date | string | Dayjs): string {
  return new Intl.DateTimeFormat(LOCALE, { timeStyle: "short", hourCycle: "h23" }).format(djs(date).toDate());
}
export function formatTimestamp(date: Date | string | Dayjs): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "long", timeStyle: "short" }).format(djs(date).toDate());
}

export function useFormatters() {
  const ctx = useMembership();
  const currency = ctx.membership?.organization.currency;

  return {
    currency: (value: number) => formatCurrency(value, currency),
    projectBilling(billableRate: number | null): string {
      if (!billableRate) return "Default Rate";
      return formatCurrency(billableRate / 100, currency);
    },
  };
}
