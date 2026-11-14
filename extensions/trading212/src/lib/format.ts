import { priceInMajorUnits } from "./yahoo/chart";

const MINUS = "−";

let locale = "en-US";

/**
 * Locale for numbers and amounts — the Mac's region (set once per command from macOS AppleLocale).
 * Unsupported tags are ignored. Defaults to en-US.
 */
export function setNumberLocale(tag: string): void {
  try {
    if (Intl.NumberFormat.supportedLocalesOf([tag]).length > 0) locale = tag;
  } catch {
    // invalid tag: keep the current locale
  }
}

export function numberLocale(): string {
  return locale;
}

/** macOS AppleLocale ("en_CZ", "cs_CZ@currency=CZK") → BCP 47 ("en-CZ"); null when empty. */
export function appleLocaleToBcp47(appleLocale: string): string | null {
  const tag = appleLocale.trim().split("@")[0].replace(/_/g, "-");
  return tag ? tag : null;
}

export type Direction = "up" | "down";

/** Up or down by sign; undefined when the value rounds to zero at one decimal (shown as "0.0"). */
export function directionOf(value: number): Direction | undefined {
  const rounded = Number(value.toFixed(1));
  if (rounded > 0) return "up";
  if (rounded < 0) return "down";
  return undefined;
}

function applySign(text: string, value: number, signed: boolean): string {
  if (!/[1-9]/.test(text)) return text.replace("-", "");
  if (text.startsWith("-")) return MINUS + text.slice(1);
  if (signed && value > 0) return "+" + text;
  return text;
}

type Digits = Pick<Intl.NumberFormatOptions, "minimumFractionDigits" | "maximumFractionDigits">;

function localeSeparators(): { group?: string; decimal?: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
  return {
    group: parts.find((p) => p.type === "group")?.value,
    decimal: parts.find((p) => p.type === "decimal")?.value,
  };
}

/** Text around the number in the region's currency layout, e.g. { before: "", after: " CZK" } or { before: "€", after: "" }. */
function currencyLayout(symbol: string): { before: string; after: string } {
  // USD has the most complete layout data; its placement and spacing stand in for any currency.
  const ref = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).formatToParts(1);
  const currencyAt = ref.findIndex((p) => p.type === "currency");
  const numberAt = ref.findIndex((p) => p.type === "integer");
  const gap = ref
    .slice(Math.min(currencyAt, numberAt) + 1, Math.max(currencyAt, numberAt))
    .filter((p) => p.type === "literal")
    .map((p) => p.value)
    .join("");
  return currencyAt < numberAt ? { before: symbol + gap, after: "" } : { before: "", after: gap + symbol };
}

/**
 * Unsigned money text in the region's format. Intl is inconsistent for some regions (English with a
 * Czech region writes "€69.82" but "160,94 US$"), so an amount that doesn't use the region's
 * separators is rebuilt from the region's number format and currency layout.
 */
function moneyText(amount: number, currency: string, digits: Digits): string {
  const format = new Intl.NumberFormat(locale, { style: "currency", currency, ...digits });
  const parts = format.formatToParts(amount);
  // Judge the currency on a sample with separators: a whole amount like 224 shows none.
  const sample = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 });
  const { group, decimal } = localeSeparators();
  const regional = sample
    .formatToParts(1234.5)
    .every((p) => (p.type !== "group" || p.value === group) && (p.type !== "decimal" || p.value === decimal));
  if (regional) return parts.map((p) => p.value).join("");
  const symbol = parts.find((p) => p.type === "currency")?.value ?? currency;
  const { before, after } = currencyLayout(symbol);
  const number = new Intl.NumberFormat(locale, digits).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}${before}${number}${after}`;
}

export function formatMoney(
  amount: number,
  currency: string,
  opts: { signed?: boolean; decimals?: 0 | 2 } = {},
): string {
  const decimals = opts.decimals ?? 2;
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  let text: string;
  try {
    text = moneyText(amount, currency, digits);
  } catch {
    // Trading 212 sometimes omits a currency (or sends one Intl doesn't know): show the number rather than crash.
    const plain = new Intl.NumberFormat(locale, digits).format(amount);
    text = currency ? `${plain} ${currency}` : plain;
  }
  return applySign(text, amount, opts.signed ?? false);
}

export function formatPct(pct: number, opts: { signed?: boolean; decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 1;
  const text = new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(pct / 100);
  return applySign(text, Number(pct.toFixed(decimals)), opts.signed ?? false);
}

/** A plain number in the region's format, up to `maxDecimals` decimals (share quantities). */
export function formatNumber(n: number, maxDecimals = 4): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxDecimals }).format(n);
}

/** "23,7k CZK", "€48.2k" — short amounts for chart labels, with the currency where full amounts put it. */
export function formatMoneyCompact(amount: number, currency: string): string {
  // A sample with separators, so the region check in moneyText applies to the layout too.
  const digits = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const sample = moneyText(1234.5, currency, digits);
  const [before, after] = sample.split(new Intl.NumberFormat(locale, digits).format(1234.5));
  const number = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 })
    .formatToParts(Math.abs(amount))
    // "K"/"M" → "k"/"m"; longer suffixes ("tis.", "Mio.") stay as the locale writes them.
    .map((p) => (p.type === "compact" && /^[KMBT]$/.test(p.value) ? p.value.toLowerCase() : p.value))
    .join("");
  return `${amount < 0 ? MINUS : ""}${before}${number}${after ?? ""}`;
}

export function formatPrice(price: number, currency: string): string {
  const major = priceInMajorUnits(price, currency);
  return formatMoney(major.price, major.currency);
}

export function formatRelativeMinutes(fromMs: number, nowMs: number): string {
  const minutes = Math.floor((nowMs - fromMs) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} h ago`;
}
