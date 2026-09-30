import { Color } from "@raycast/api";
import { PriceElement } from "./types";

export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatConnector(type: string): string {
  const map: Record<string, string> = {
    sType1: "Type 1",
    sType2: "Type 2",
    sType3: "Type 3",
    sCCS: "CCS",
    cCCS1: "CCS1",
    cCCS2: "CCS2",
    sCHAdeMO: "CHAdeMO",
    cCHAdeMO: "CHAdeMO",
    sTesla: "Tesla",
    sSchuko: "Schuko",
    sDomestic: "Domestic",
  };
  return map[type] ?? type;
}

export function availabilityColor(available: number, total: number): Color {
  if (total === 0 || available === 0) return Color.Red;
  const ratio = available / total;
  if (ratio >= 0.5) return Color.Green;
  return Color.Orange;
}

export function statusColor(status: string): Color {
  const s = status.toLowerCase();
  if (s === "available") return Color.Green;
  if (s === "inuse" || s === "in_use") return Color.Orange;
  return Color.Red;
}

export function statusText(status: string): string {
  const s = status.toLowerCase();
  if (s === "available") return "Available";
  if (s === "inuse" || s === "in_use") return "In Use";
  if (s === "outofservice" || s === "out_of_service") return "Out of Service";
  if (s === "unknown") return "Unknown";
  if (s === "reserved") return "Reserved";
  return status;
}

export function formatPrice(price: number, currency = "DKK"): string {
  return `${price.toFixed(2)} ${currency}/kWh`;
}

export function formatTimeWindow(el: PriceElement): string {
  const r = el.restrictions;
  if (!r?.start_time || !r?.end_time) return "Fallback";
  return `${r.start_time} – ${r.end_time}`;
}

export function elementStartDate(el: PriceElement): Date | null {
  const r = el.restrictions;
  if (!r?.start_date || !r?.start_time) return null;
  return new Date(`${r.start_date}T${r.start_time}:00`);
}

export function elementEndDate(el: PriceElement): Date | null {
  const r = el.restrictions;
  if (!r?.end_date || !r?.end_time) return null;
  // An interval like 23:45–00:00 crosses the day — use end_date directly.
  return new Date(`${r.end_date}T${r.end_time}:00`);
}

export function prettyDate(dateStr: string, now: Date = new Date()): string {
  if (!dateStr) return "";
  const today = toYmd(now);
  const tomorrow = toYmd(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isCurrent(el: PriceElement, now: Date = new Date()): boolean {
  const start = elementStartDate(el);
  const end = elementEndDate(el);
  if (!start || !end) return false;
  return now >= start && now < end;
}

export function isUpcoming(el: PriceElement, now: Date = new Date()): boolean {
  const start = elementStartDate(el);
  if (!start) return false;
  return start > now;
}

// A price element is a fallback (no scheduled window) when it has no time/date
// bounds. An element with only non-temporal restrictions (e.g. day_of_week) is
// also treated as a fallback here — Spirii tariffs don't use those today.
export function isFallback(el: PriceElement): boolean {
  const r = el.restrictions;
  if (!r) return true;
  return !r.start_time && !r.end_time && !r.start_date && !r.end_date;
}

export type PriceTier = "cheap" | "mid" | "expensive";

export function tierForPrices(prices: number[]): (price: number) => PriceTier {
  // With too few samples, quartiles collapse and every item ends up at an extreme.
  // Treat those as "mid" so we don't mislead the user with false cheap/expensive tags.
  if (prices.length < 6) return () => "mid";
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  if (q1 === q3) return () => "mid";
  return (price: number) => {
    if (price <= q1) return "cheap";
    if (price >= q3) return "expensive";
    return "mid";
  };
}

export function tierColor(tier: PriceTier): Color {
  if (tier === "cheap") return Color.Green;
  if (tier === "expensive") return Color.Red;
  return Color.Yellow;
}
