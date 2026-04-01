import type {
  PopularDirection,
  RateItem,
  ExchangerRatesResponse,
  Currency,
  CurrencyPair,
  Exchanger,
  BatchRateItem,
  Locale,
} from "./types";

// Cached endpoints for extension (no extra DB load)
const API_BASE = "https://kurslog.com/api/raycast";
// Direct API for real-time data (rates by direction) and redirect
const API_DIRECT = "https://kurslog.com/api";

async function apiFetch<T>(
  path: string,
  locale: Locale,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Accept-Language": locale,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Direct API call (no raycast cache) for real-time data */
async function apiDirect<T>(
  path: string,
  locale: Locale,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_DIRECT}${path}`, {
    ...init,
    headers: {
      "Accept-Language": locale,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPopularDirections(
  locale: Locale,
  limit = 30,
): Promise<PopularDirection[]> {
  return apiFetch<PopularDirection[]>(
    `/directions/popular?limit=${limit}`,
    locale,
  );
}

/** Real-time: full rates from main API (not cached in raycast layer) */
export async function fetchAllRates(
  from: string,
  to: string,
  locale: Locale,
): Promise<ExchangerRatesResponse[]> {
  const data = await apiDirect<{ exchangers: ExchangerRatesResponse[] }>(
    `/rates/direction/${from}-to-${to}`,
    locale,
  );
  return data.exchangers;
}

export async function fetchTopRates(
  from: string,
  to: string,
  locale: Locale,
  limit = 10,
): Promise<RateItem[]> {
  const data = await apiFetch<{ rates: RateItem[] }>(
    `/rates/${from}-to-${to}/top?limit=${limit}`,
    locale,
  );
  return data.rates;
}

export async function fetchCurrencies(locale: Locale): Promise<Currency[]> {
  return apiFetch<Currency[]>("/currencies/list", locale);
}

export async function fetchPairs(locale: Locale): Promise<CurrencyPair[]> {
  return apiFetch<CurrencyPair[]>("/currencies/pairs", locale);
}

export async function fetchExchangers(locale: Locale): Promise<Exchanger[]> {
  return apiFetch<Exchanger[]>("/exchangers/list", locale);
}

/** Real-time: batch rates from main API */
export async function fetchBatchRates(
  directions: { from: string; to: string }[],
  locale: Locale,
): Promise<BatchRateItem[]> {
  return apiDirect<BatchRateItem[]>("/directions/batch-rates", locale, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ directions }),
  });
}

// --- Countries & Cities (for cash directions) ---

export interface Country {
  id: number;
  code: string;
  name_uk: string;
  name_ru: string;
  name_en: string;
  url: string;
  popularity?: number;
}

export interface City {
  id: number;
  name_uk: string;
  name_ru: string;
  name_en: string;
  url: string;
  country_id: number;
  popularity?: number;
}

export async function fetchCountries(
  locale: Locale,
  fromCurrency?: string,
  toCurrency?: string,
): Promise<Country[]> {
  const params = new URLSearchParams({ locale });
  if (fromCurrency) params.set("from_currency", fromCurrency);
  if (toCurrency) params.set("to_currency", toCurrency);
  return apiFetch<Country[]>(`/countries/list?${params}`, locale);
}

export async function fetchCities(
  from: string,
  to: string,
  locale: Locale,
  countryId?: number,
): Promise<City[]> {
  const q = countryId ? `?country_id=${countryId}` : "";
  return apiFetch<City[]>(`/cities/by-direction/${from}-to-${to}${q}`, locale);
}

/** Flatten ExchangerRatesResponse[] into flat RateItem[] with trust status */
export function flattenRates(exchangers: ExchangerRatesResponse[]): RateItem[] {
  return exchangers.flatMap((ex) =>
    ex.rates.map((rate) => ({
      ...rate,
      exchanger_id: ex.exchanger_id,
      exchanger_name: ex.exchanger_name,
      exchanger_rating: ex.exchanger_rating,
      exchanger_internal_url: ex.exchanger_internal_url,
      exchanger_trust_score_total: ex.exchanger_trust_score_total,
      trust_status_name: ex.trust_status_name,
      trust_status_label: ex.trust_status_label,
      trust_status_color: ex.trust_status_color,
      trust_status_css_class: ex.trust_status_css_class,
      trust_status_icon_path: ex.trust_status_icon_path,
      trust_status_explanation: ex.trust_status_explanation,
    })),
  );
}
