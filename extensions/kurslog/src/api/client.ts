import type {
  PopularDirection,
  RateItem,
  ExchangerRatesResponse,
  Currency,
  CurrencyPair,
  Exchanger,
  BatchRateItem,
} from "./types";

// Cached endpoints for extension (no extra DB load)
const API_BASE = "https://kurslog.com/api/raycast";
// Direct API for real-time data (rates by direction) and redirect
const API_DIRECT = "https://kurslog.com/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Accept-Language": "en",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Direct API call (no raycast cache) for real-time data */
async function apiDirect<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_DIRECT}${path}`, {
    ...init,
    headers: {
      "Accept-Language": "en",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchPopularDirections(
  limit = 30,
): Promise<PopularDirection[]> {
  return apiFetch<PopularDirection[]>(`/directions/popular?limit=${limit}`);
}

/** Real-time: full rates from main API (not cached in raycast layer) */
export async function fetchAllRates(
  from: string,
  to: string,
  cityUrl?: string,
): Promise<ExchangerRatesResponse[]> {
  const q = cityUrl ? `?city_url=${encodeURIComponent(cityUrl)}` : "";
  const data = await apiDirect<{ exchangers: ExchangerRatesResponse[] }>(
    `/rates/direction/${from}-to-${to}${q}`,
  );
  return data.exchangers;
}

export async function fetchTopRates(
  from: string,
  to: string,
  limit = 10,
): Promise<RateItem[]> {
  const data = await apiFetch<{ rates: RateItem[] }>(
    `/rates/${from}-to-${to}/top?limit=${limit}`,
  );
  return data.rates;
}

export async function fetchCurrencies(): Promise<Currency[]> {
  return apiFetch<Currency[]>("/currencies/list");
}

export async function fetchPairs(): Promise<CurrencyPair[]> {
  return apiFetch<CurrencyPair[]>("/currencies/pairs");
}

export async function fetchExchangers(): Promise<Exchanger[]> {
  return apiFetch<Exchanger[]>("/exchangers/list");
}

/** Real-time: batch rates from main API */
export async function fetchBatchRates(
  directions: { from: string; to: string }[],
): Promise<BatchRateItem[]> {
  return apiDirect<BatchRateItem[]>("/directions/batch-rates", {
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
  fromCurrency?: string,
  toCurrency?: string,
): Promise<Country[]> {
  const params = new URLSearchParams({ locale: "en" });
  if (fromCurrency) params.set("from_currency", fromCurrency);
  if (toCurrency) params.set("to_currency", toCurrency);
  return apiFetch<Country[]>(`/countries/list?${params}`);
}

export async function fetchCities(
  from: string,
  to: string,
  countryId?: number,
): Promise<City[]> {
  const q = countryId ? `?country_id=${countryId}` : "";
  return apiFetch<City[]>(`/cities/by-direction/${from}-to-${to}${q}`);
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
