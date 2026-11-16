import type { Address } from "./types";

export type Locale = "en" | "nb";

const intlLocale = (locale: Locale) => (locale === "nb" ? "nb-NO" : "en-GB");

export function formatNumber(value: number | null | undefined, locale: Locale, maximumFractionDigits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits }).format(value);
}

export function formatMoney(value: number | null | undefined, currency: string | null | undefined, locale: Locale) {
  if (value === null || value === undefined) return "–";
  return `${formatNumber(value, locale)} ${currency ?? "NOK"}`;
}

/** Compact money, e.g. `1.2 bn NOK` / `1,2 mrd. NOK`. Input is in whole units. */
export function formatCompactMoney(
  value: number | null | undefined,
  currency: string | null | undefined,
  locale: Locale,
): string {
  if (value === null || value === undefined) return "–";
  const formatted = new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${currency ?? "NOK"}`;
}

/** Compact number without currency, e.g. `68bn` / `68 mrd.`. */
export function formatCompactNumber(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "–";
  return new Intl.NumberFormat(intlLocale(locale), { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Change from `previous` to `current`, e.g. `+3.2 %`. Undefined when it can't be computed meaningfully. */
export function formatChange(current: unknown, previous: unknown, locale: Locale): string | undefined {
  if (typeof current !== "number" || typeof previous !== "number" || previous === 0) return undefined;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(change)) return undefined;
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(change), locale, 1)} %`;
}

export function formatPercent(value: number | null | undefined, locale: Locale): string {
  if (value === null || value === undefined) return "–";
  const digits = value >= 10 ? 1 : value >= 1 ? 2 : 3;
  return `${formatNumber(value, locale, digits)} %`;
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "–";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "Europe/Oslo" }).format(date);
}

export function formatAddress(address: Address | null | undefined): string | undefined {
  if (!address) return undefined;
  const street = (address.adresse ?? []).filter(Boolean).join(", ");
  const place = [address.postnummer, address.poststed].filter(Boolean).join(" ");
  const parts = [street, place].filter(Boolean);
  if (address.land && address.land !== "Norge") parts.push(address.land);
  return parts.length ? parts.join(", ") : undefined;
}

export function websiteUrl(site: string | null | undefined): string | undefined {
  if (!site) return undefined;
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}
