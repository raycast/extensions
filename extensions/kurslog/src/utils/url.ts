import type { Locale } from "../api/types";

function localePrefix(locale: Locale): string {
  return locale === "uk" ? "" : `/${locale}`;
}

export function directionUrl(from: string, to: string, locale: Locale): string {
  return `https://kurslog.com${localePrefix(locale)}/${from}-to-${to}`;
}

export function exchangerUrl(internalUrl: string, locale: Locale): string {
  return `https://kurslog.com${localePrefix(locale)}/exchangers/${internalUrl}`;
}

export function homeUrl(locale: Locale): string {
  return `https://kurslog.com${localePrefix(locale)}`;
}

/** Redirect URL for exchange — tracks click and redirects to exchanger site */
export function redirectUrl(params: {
  from: string;
  to: string;
  exchangerId: number;
  amount?: number;
  locale: Locale;
  position?: number;
  sort?: string;
  cityUrl?: string;
}): string {
  const p = new URLSearchParams({
    from: params.from,
    to: params.to,
    amount: String(params.amount || 1),
    exchange_id: String(params.exchangerId),
    lang: params.locale,
    src: "extension",
    plt: "raycast",
  });
  if (params.position != null) p.set("pos", String(params.position));
  if (params.sort) p.set("sort", params.sort);
  if (params.amount) p.set("amt", String(params.amount));
  if (params.cityUrl) p.set("city_url", params.cityUrl);
  return `https://kurslog.com/api/redirect/redirect_to_exchange_service?${p}`;
}
