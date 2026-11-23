import {
  MenuBarMetric,
  MenuBarStyle,
  Quote,
  QuoteStatus,
} from "./market-types";

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

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

export function toSubscriptDigits(value: number | string): string {
  return String(value)
    .split("")
    .map((char) => SUBSCRIPT_DIGITS[char] ?? char)
    .join("");
}

export function compressSubscriptZeros(formattedPrice: string): string {
  const match = formattedPrice.match(/^(\D*0\.)(0{2,})([1-9]\d*)(.*)$/);
  if (!match) return formattedPrice;
  return `${match[1]}0${toSubscriptDigits(match[2].length)}${match[3]}${match[4]}`;
}

export function formatSubscriptPrice(
  value: number | string,
  currency = "usd",
): string {
  if (typeof value === "string") {
    return compressSubscriptZeros(value);
  }
  if (value === 0 || Math.abs(value) >= 0.01) {
    return formatPrice(value, currency);
  }
  const formatted = formatPrice(value, currency);
  return compressSubscriptZeros(formatted);
}

export const formatSubscriptZeroPrice = formatSubscriptPrice;

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

export function formatMarketCap(
  value: number | undefined | null,
  currency = "usd",
): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    notation: "compact",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

export const formatCompactMarketCap = formatMarketCap;

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

export function isDexTokenQuote(quote: Quote): boolean {
  return (
    quote.kind === "token" ||
    quote.id.startsWith("token:") ||
    quote.provider?.toLowerCase().includes("dex")
  );
}

export function quoteCurrency(quote: Quote): string {
  if (quote.currency && quote.currency.toLowerCase() !== "probability") {
    return quote.currency.toLowerCase();
  }
  if (quote.priceLabel) {
    if (quote.priceLabel.includes("€")) return "eur";
    if (quote.priceLabel.includes("£")) return "gbp";
    if (quote.priceLabel.startsWith("CA$")) return "cad";
  }
  return "usd";
}

function formatQuoteValue(
  quote: Quote,
  metric: MenuBarMetric,
  marketCapDexOnly: boolean,
): string {
  const hasMarketCap =
    typeof quote.marketCap === "number" &&
    Number.isFinite(quote.marketCap) &&
    quote.marketCap > 0;
  const showMarketCap =
    metric === "market-cap" &&
    hasMarketCap &&
    (!marketCapDexOnly || isDexTokenQuote(quote));
  if (showMarketCap) {
    return formatMarketCap(quote.marketCap, quoteCurrency(quote));
  }
  if (quote.priceLabel) {
    return compressSubscriptZeros(quote.priceLabel);
  }
  return formatSubscriptPrice(quote.price, quoteCurrency(quote));
}

export function formatMenuTitle(
  quote: Quote | Quote[] | undefined,
  style: MenuBarStyle,
  metric: MenuBarMetric = "price",
  marketCapDexOnly = false,
): string | undefined {
  if (!quote) return undefined;
  switch (style) {
    case "primary": {
      const target = Array.isArray(quote) ? quote[0] : quote;
      if (!target) return undefined;
      const staleMarker = quoteFreshness(target) === "stale" ? " ⚠" : "";
      const displayValue = formatQuoteValue(target, metric, marketCapDexOnly);
      return `${target.symbol} ${displayValue}${staleMarker}`;
    }
    case "primary-change": {
      const target = Array.isArray(quote) ? quote[0] : quote;
      if (!target) return undefined;
      const staleMarker = quoteFreshness(target) === "stale" ? " ⚠" : "";
      const displayValue = formatQuoteValue(target, metric, marketCapDexOnly);
      const change =
        typeof target.changePercent === "number"
          ? ` ${formatPercent(target.changePercent)}`
          : "";
      return `${target.symbol} ${displayValue}${change}${staleMarker}`;
    }
    case "multi-ticker": {
      const targets = (Array.isArray(quote) ? quote : [quote])
        .filter((q): q is Quote => Boolean(q))
        .slice(0, 3);
      if (targets.length === 0) return undefined;
      return targets
        .map((target) => {
          const staleMarker = quoteFreshness(target) === "stale" ? " ⚠" : "";
          const displayValue = formatQuoteValue(
            target,
            metric,
            marketCapDexOnly,
          );
          return `${target.symbol} ${displayValue}${staleMarker}`;
        })
        .join(" | ");
    }
    default: {
      const exhaustive: never = style;
      return exhaustive;
    }
  }
}

export function orderedMultiTickerIds(
  watchlist: string[],
  primaryId?: string,
): string[] {
  const resolvedPrimary = primaryId ?? watchlist[0];
  if (!resolvedPrimary) return [];
  const secondary = watchlist.filter((id) => id !== resolvedPrimary);
  return [resolvedPrimary, ...secondary].slice(0, 3);
}

export function orderedMultiTickerQuotes(
  watchlist: string[],
  quotes: Record<string, Quote>,
  primaryId?: string,
): Quote[] {
  return orderedMultiTickerIds(watchlist, primaryId)
    .map((id) => quotes[id])
    .filter((q): q is Quote => Boolean(q));
}
