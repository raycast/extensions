// Number and label helpers. No Raycast imports, so tests can run them.

export const PERIODS = [
  { value: "today", title: "Today" },
  { value: "24h", title: "Last 24 Hours" },
  { value: "7d", title: "Last 7 Days" },
  { value: "30d", title: "Last 30 Days" },
  { value: "mtd", title: "Month to Date" },
  { value: "12mo", title: "Last 12 Months" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export function isPeriod(value: unknown): value is Period {
  return PERIODS.some((p) => p.value === value);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (Math.abs(n) >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (Math.abs(n) >= 10_000) return `${trim(n / 1_000)}k`;
  return Math.round(n).toLocaleString("en-US");
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return `${trim(n)}%`;
}

export function formatChange(n: number | null | undefined): string | undefined {
  if (n === null || n === undefined || Number.isNaN(n)) return undefined;
  const sign = n > 0 ? "+" : "";
  return `${sign}${trim(n)}%`;
}

// visit_duration comes in milliseconds.
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "–";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Revenue comes in cents.
export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return "–";
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// For bounce rate a rise is bad, for everything else a rise is good.
export function changeIsGood(metric: string, change: number): boolean {
  return metric === "bounce_rate" ? change <= 0 : change >= 0;
}

export function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function referrerLabel(value: string): string {
  return value === "" ? "Direct / None" : value;
}

const BARS = "▁▂▃▄▅▆▇█";

// A tiny text chart for the last days of visitors.
export function sparkline(values: number[] | undefined, points = 14): string {
  if (!values || values.length === 0) return "";
  const slice = values.slice(-points);
  const max = Math.max(...slice);
  if (max <= 0) return BARS[0].repeat(slice.length);
  return slice.map((v) => BARS[Math.min(BARS.length - 1, Math.floor((v / max) * (BARS.length - 1)))]).join("");
}
