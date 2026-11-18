import { MenuBarStyle, Quote, QuoteStatus } from "./market-types";

export type QuoteFreshness = "fresh" | "stale" | "unavailable";

export function formatPrice(value: number, currency = "usd") {
  if (currency.toLowerCase() === "probability")
    return `${Math.round(value * 100)}%`;

  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currency.toUpperCase(),
  };
  if (value !== 0 && Math.abs(value) < 0.01) {
    options.maximumSignificantDigits = 4;
    options.minimumSignificantDigits = 2;
  } else {
    options.maximumFractionDigits = value >= 100 ? 0 : 2;
  }
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(Math.abs(value) >= 10 ? 0 : 1)}%`;
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatProbability(value: number | string | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : "—";
}

export function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function truncateText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function quoteFreshness(
  quote: Quote | undefined,
  now = Date.now(),
): QuoteFreshness {
  if (!quote) return "unavailable";
  if (quote.error) return "stale";
  const lastSuccess = quote.lastSuccessAt
    ? Date.parse(quote.lastSuccessAt)
    : Date.parse(quote.asOf);
  if (!Number.isFinite(lastSuccess) || now - lastSuccess > 15 * 60_000)
    return "stale";
  return "fresh";
}

export function shouldRefreshQuote(
  quote: Quote | undefined,
  status: QuoteStatus | undefined,
  ttlMs: number,
  force = false,
  now = Date.now(),
) {
  const retryAfter = status?.retryAfterAt
    ? Date.parse(status.retryAfterAt)
    : quote?.retryAfterAt
      ? Date.parse(quote.retryAfterAt)
      : Number.NaN;
  if (Number.isFinite(retryAfter) && retryAfter > now) return false;
  if (force || !quote) return true;
  const lastSuccess = quote.lastSuccessAt
    ? Date.parse(quote.lastSuccessAt)
    : Date.parse(quote.asOf);
  return !Number.isFinite(lastSuccess) || now - lastSuccess >= ttlMs;
}

export function formatAge(iso: string, now = Date.now()) {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return "unknown";
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatMenuTitle(
  quote: Quote | undefined,
  style: MenuBarStyle,
): string | undefined {
  if (!quote) return undefined;
  const staleMarker = quoteFreshness(quote) === "stale" ? " ⚠" : "";
  switch (style) {
    case "primary":
      return `${quote.symbol} ${quote.priceLabel}${staleMarker}`;
    case "primary-change": {
      const change =
        typeof quote.changePercent === "number"
          ? ` ${formatPercent(quote.changePercent)}`
          : "";
      return `${quote.symbol} ${quote.priceLabel}${change}${staleMarker}`;
    }
    default: {
      const exhaustive: never = style;
      return exhaustive;
    }
  }
}
