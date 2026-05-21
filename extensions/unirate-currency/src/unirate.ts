import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://api.unirateapi.com/api";

export type RatesResponse = {
  base: string;
  rates: Record<string, number>;
  date?: string;
};

export type ConvertResponse = {
  from: string;
  to: string;
  amount: number;
  result: number;
  date?: string;
};

export class UniRateError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "UniRateError";
    this.status = status;
    this.body = body;
  }
}

function apiKey(): string {
  const { api_key } = getPreferenceValues<Preferences>();
  const trimmed = (api_key ?? "").trim();
  if (!trimmed) {
    throw new UniRateError("Missing UniRate API key. Set one in extension preferences.", 0, "");
  }
  return trimmed;
}

function defaultDecimals(): number {
  const { decimals } = getPreferenceValues<Preferences>();
  const n = Number.parseInt(decimals ?? "4", 10);
  if (Number.isNaN(n) || n < 0 || n > 12) {
    return 4;
  }
  return n;
}

export function getDefaultDecimals(): number {
  return defaultDecimals();
}

export function getDefaultBase(): string {
  const { default_base } = getPreferenceValues<Preferences>();
  const code = (default_base ?? "USD").trim().toUpperCase();
  return /^[A-Z]{3,5}$/.test(code) ? code : "USD";
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function get<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const search = new URLSearchParams({ ...params, api_key: apiKey() });
  const safeUrl = `${BASE_URL}${path}?${new URLSearchParams({ ...params, api_key: "***" }).toString()}`;
  console.log(`UniRate request → ${safeUrl}`);

  const response = await fetch(`${BASE_URL}${path}?${search.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body — fall through to error path below
  }

  if (!response.ok) {
    const detail =
      (json &&
      typeof json === "object" &&
      "message" in json &&
      typeof (json as { message: unknown }).message === "string"
        ? (json as { message: string }).message
        : null) ??
      (json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : null) ??
      `HTTP ${response.status}`;

    if (response.status === 401) {
      throw new UniRateError("Invalid UniRate API key. Check it in extension preferences.", 401, text);
    }
    if (response.status === 403) {
      throw new UniRateError(
        "This endpoint requires a UniRate Pro key (historical and commodities are Pro-gated).",
        403,
        text,
      );
    }
    if (response.status === 429) {
      throw new UniRateError("Rate limit reached. Wait a minute and try again.", 429, text);
    }
    throw new UniRateError(detail, response.status, text);
  }

  if (!json) {
    throw new UniRateError("UniRate returned an empty response.", response.status, text);
  }
  return json as T;
}

export async function fetchLatestRates(base: string, signal?: AbortSignal): Promise<RatesResponse> {
  return get<RatesResponse>("/rates", { from: base.toUpperCase() }, signal);
}

export async function convertCurrency(
  from: string,
  to: string,
  amount: number,
  date: Date | null,
  signal?: AbortSignal,
): Promise<ConvertResponse> {
  const params: Record<string, string> = {
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    amount: String(amount),
  };
  if (date) {
    params.date = isoDate(date);
    return get<ConvertResponse>("/historical/convert", params, signal);
  }
  return get<ConvertResponse>("/convert", params, signal);
}

export type CurrencyEntry = { code: string; name?: string };

export async function fetchCurrencies(signal?: AbortSignal): Promise<CurrencyEntry[]> {
  // Latest-rate response keys are the authoritative currency list on the free tier;
  // /currencies returns HTML 404 unless Accept: application/json is sent and is Pro on some plans.
  const data = await fetchLatestRates(getDefaultBase(), signal);
  const codes = Object.keys(data.rates ?? {}).sort();
  // Ensure the base is in the list (some bases are absent from their own rates payload).
  const base = (data.base ?? getDefaultBase()).toUpperCase();
  if (!codes.includes(base)) codes.unshift(base);
  return codes.map((code) => ({ code }));
}
