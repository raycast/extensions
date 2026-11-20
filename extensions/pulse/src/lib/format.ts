// Numbers and times, the way Pulse for Herdr writes them.
import type { Quote } from "./quotes";

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Below 1, keep 2 to 4 significant digits: 0.00000441 must not round to 0.000004. */
function significant(price: number): string {
  const places = Math.min(20, 3 - Math.floor(Math.log10(price)));
  let text = price.toFixed(places);
  const count = (s: string) => s.replace(".", "").replace(/^0+/, "").length;
  while (text.endsWith("0") && count(text) > 2) text = text.slice(0, -1);
  return text;
}

// Prices in these currencies are quoted in whole units: 229,000 KRW, not 229,000.00.
const WHOLE_UNITS = new Set(["JPY", "KRW"]);

export function formatNumber(price: number, currency: string | null = null): string {
  const whole = currency !== null && WHOLE_UNITS.has(currency) && Number.isInteger(price);
  const [integer, fraction] = (price < 1 ? significant(price) : price.toFixed(whole ? 0 : 2)).split(".");
  return group(integer) + (fraction === undefined ? "" : "." + fraction);
}

/** A chart's axis label: no cents once the price runs to four digits. */
export function formatAxis(price: number): string {
  return price >= 1000 ? group(Math.round(price).toString()) : formatNumber(price);
}

export function formatPrice(price: number, currency: string | null): string {
  return currency ? `${formatNumber(price, currency)} ${currency}` : formatNumber(price);
}

export function formatChange(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

const pad = (value: number) => String(value).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Local wall-clock time, with the date when it is not today's: "15:04" or "Oct 31, 16:00". */
export function formatTimestamp(timestamp: number, now: number): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  return sameDay ? time : `${MONTHS[date.getMonth()]} ${date.getDate()}, ${time}`;
}

export const SESSION_LABELS: Record<Quote["session"], string> = {
  open: "Market open",
  pre: "Pre-market",
  post: "After hours",
  closed: "Market closed",
  "24h": "Trades 24h",
};

/** Never present an unknown delay as real time. */
export function formatDelay(quote: Quote): string {
  if (quote.delaySeconds === null) return "Exchange delays vary";
  if (quote.delaySeconds === 0) return quote.source === "Binance Spot" ? "Real time" : "No exchange delay";
  return `Delayed ${Math.ceil(quote.delaySeconds / 60)} min`;
}
