/** Seconds between the Unix epoch and Apple's reference date (2001-01-01), used by Swift's `Date`. */
const COCOA_EPOCH_OFFSET = 978_307_200;

/** Converts a Swift `Date` encoded as seconds since 2001-01-01. */
export function cocoaDate(seconds: unknown): Date | undefined {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date((seconds + COCOA_EPOCH_OFFSET) * 1000);
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export type PercentMode = "remaining" | "used";

export function shownPercent(usedPercent: number, mode: PercentMode): number {
  const used = clampPercent(usedPercent);
  return Math.round(mode === "used" ? used : 100 - used);
}

export function percentLabel(usedPercent: number, mode: PercentMode): string {
  return `${shownPercent(usedPercent, mode)}% ${mode === "used" ? "used" : "left"}`;
}

export type Severity = "ok" | "warning" | "critical" | "exhausted";

/** Severity is always based on what is left, regardless of how percentages are displayed. */
export function severity(usedPercent: number): Severity {
  const left = 100 - clampPercent(usedPercent);
  if (left <= 0) return "exhausted";
  if (left <= 10) return "critical";
  if (left <= 30) return "warning";
  return "ok";
}

/** Compact duration: `6d 11h`, `4h 12m`, `12m`, `<1m`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 60_000) return "<1m";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export function formatResetIn(resetsAt: Date | undefined, now: Date = new Date()): string | undefined {
  if (!resetsAt) return undefined;
  const ms = resetsAt.getTime() - now.getTime();
  if (ms <= 0) return "Resetting now";
  return `Resets in ${formatDuration(ms)}`;
}

export function formatCurrency(amount: number | undefined, currency = "USD"): string {
  if (amount === undefined || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
