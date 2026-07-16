import { getAccessToken } from "@raycast/utils";
import { SCHWAB_TRADER_BASE, SCHWAB_MARKET_DATA_BASE } from "./constants";
import { schwabOAuth } from "./oauth";
import type { Account, AccountNumberMapping, UserPreferenceResponse } from "../types/accounts";
import type { Order } from "../types/orders";
import type { QuoteResponse, PriceHistoryResponse, InstrumentSearchResponse, MoversResponse } from "../types/quotes";

class SchwabApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "SchwabApiError";
  }
}

async function schwabFetch<T>(url: string, retries = 2): Promise<T> {
  let { token } = getAccessToken();
  let rateLimitRetries = 0;
  let retriedAuthentication = false;

  while (true) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 429 && rateLimitRetries < retries) {
      // Rate limited — wait with exponential backoff
      const delay = Math.pow(2, rateLimitRetries) * 1000;
      rateLimitRetries += 1;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    if (response.status === 401) {
      if (!retriedAuthentication) {
        token = await schwabOAuth.authorize();
        retriedAuthentication = true;
        continue;
      }
      throw new SchwabApiError("Authentication failed. Please re-authenticate.", 401);
    }

    const errorText = await response.text().catch(() => "Unknown error");
    throw new SchwabApiError(`Schwab API error (${response.status}): ${errorText}`, response.status);
  }
}

// --- Trader API ---

export async function getAccountNumbers(): Promise<AccountNumberMapping[]> {
  return schwabFetch<AccountNumberMapping[]>(`${SCHWAB_TRADER_BASE}/accounts/accountNumbers`);
}

export async function getAccounts(fields: "positions" | "" = "positions"): Promise<Account[]> {
  const params = fields ? `?fields=${fields}` : "";
  return schwabFetch<Account[]>(`${SCHWAB_TRADER_BASE}/accounts${params}`);
}

export async function getAccountByHash(accountHash: string, fields = "positions"): Promise<Account> {
  const params = fields ? `?fields=${fields}` : "";
  return schwabFetch<Account>(`${SCHWAB_TRADER_BASE}/accounts/${accountHash}${params}`);
}

/** Account nicknames the user set on schwab.com, keyed by account number. */
export async function getAccountNicknames(): Promise<Record<string, string>> {
  const preference = await schwabFetch<UserPreferenceResponse>(`${SCHWAB_TRADER_BASE}/userPreference`);
  const nicknames: Record<string, string> = {};
  for (const account of preference.accounts ?? []) {
    if (account.accountNumber && account.nickName) nicknames[account.accountNumber] = account.nickName;
  }
  return nicknames;
}

// --- Market Data API ---

export async function getQuotes(symbols: string[], fields = "quote,fundamental,reference"): Promise<QuoteResponse> {
  if (symbols.length === 0) return {};
  const symbolStr = symbols.join(",");
  return schwabFetch<QuoteResponse>(
    `${SCHWAB_MARKET_DATA_BASE}/quotes?symbols=${encodeURIComponent(symbolStr)}&fields=${fields}`,
  );
}

export async function getPriceHistory(
  symbol: string,
  periodType: string,
  period: number,
  frequencyType: string,
  frequency: number,
): Promise<PriceHistoryResponse> {
  const params = new URLSearchParams({
    symbol,
    periodType,
    period: period.toString(),
    frequencyType,
    frequency: frequency.toString(),
    needPreviousClose: "true",
  });
  return schwabFetch<PriceHistoryResponse>(`${SCHWAB_MARKET_DATA_BASE}/pricehistory?${params}`);
}

export async function searchInstruments(
  query: string,
  projection = "symbol-search",
): Promise<InstrumentSearchResponse> {
  const params = new URLSearchParams({ symbol: query, projection });
  return schwabFetch<InstrumentSearchResponse>(`${SCHWAB_MARKET_DATA_BASE}/instruments?${params}`);
}

export async function getMovers(
  indexSymbol: string,
  sort: "PERCENT_CHANGE_UP" | "PERCENT_CHANGE_DOWN",
): Promise<MoversResponse> {
  const params = new URLSearchParams({ sort, frequency: "0" });
  return schwabFetch<MoversResponse>(`${SCHWAB_MARKET_DATA_BASE}/movers/${encodeURIComponent(indexSymbol)}?${params}`);
}

/** Read-only order history across all accounts. Never places or modifies orders. */
export async function getOrders(days = 30): Promise<Order[]> {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const params = new URLSearchParams({
    fromEnteredTime: from.toISOString(),
    toEnteredTime: to.toISOString(),
    maxResults: "100",
  });
  return schwabFetch<Order[]>(`${SCHWAB_TRADER_BASE}/orders?${params}`);
}

export async function getMarketHours(): Promise<Record<string, unknown>> {
  return schwabFetch<Record<string, unknown>>(`${SCHWAB_MARKET_DATA_BASE}/markets?markets=equity`);
}
