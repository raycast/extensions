import { get } from "./client";

export type MarketState =
  | "PRE"
  | "PREPRE"
  | "REGULAR"
  | "POST"
  | "POSTPOST"
  | "CLOSED";

export interface Quote {
  symbol: string;
  currency: string;
  shortName: string;
  displayName: string;
  marketState: MarketState;
  typeDisp: string;
  regularMarketPrice: number;
  regularMarketPreviousClose: number;
  regularMarketOpen: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  preMarketPrice?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  marketCap?: number;
  fullExchangeName: string;
  exchange: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingPE?: number;
  dividendYield?: number;
  epsTrailingTwelveMonths?: number;
  earningsTimestamp?: number;
  earningsTimestampStart?: number;
  earningsTimestampEnd?: number;
}

export interface QuoteResponse {
  quoteResponse: {
    result: Quote[];
  };
}

export interface PriceInfo {
  price: number;
  change: number;
  changePercent: number;
}

export async function quote(
  symbols: string[],
  signal?: AbortSignal,
): Promise<Quote[]> {
  const res = await get<QuoteResponse>(
    "/v7/finance/quote",
    { symbols: symbols.join(",") },
    signal,
  );
  return res.quoteResponse.result;
}

export function currentPriceInfo(q: Quote): PriceInfo {
  switch (q.marketState) {
    case "PRE":
    case "PREPRE":
      if (
        q.preMarketPrice != null &&
        q.preMarketChange != null &&
        q.preMarketChangePercent != null
      ) {
        return {
          price: q.preMarketPrice,
          change: q.preMarketChange,
          changePercent: q.preMarketChangePercent,
        };
      }
      break;
    case "POST":
    case "POSTPOST":
      if (
        q.postMarketPrice != null &&
        q.postMarketChange != null &&
        q.postMarketChangePercent != null
      ) {
        return {
          price: q.postMarketPrice,
          change: q.postMarketChange,
          changePercent: q.postMarketChangePercent,
        };
      }
      break;
  }

  return {
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
  };
}
