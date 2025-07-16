import { CG_BASE_URL } from "../config";
import { CGResponse, ISymbol } from "../types/cg";
import { FundingRateHome } from "../types/cg/fundingRate";
import { IOpenInterestInfo } from "../types/cg/oi";
import { IPriceChange } from "../types/cg/priceChange";
import { Tick } from "../types/cg/ticks";
import { IExchangeInfo } from "../types/cg/exchange";

export async function fetchCoins() {
  const response = await fetch(`${CG_BASE_URL}/api/v2/support/symbol`, {});
  if (response.ok) {
    const data = (await response.json()) as unknown as CGResponse<ISymbol[]>;
    return data;
  }
  return null;
}

export async function fetchFundingRates() {
  const response = await fetch(`${CG_BASE_URL}/api/fundingRate/v2/home`, {});
  if (response.ok) {
    const data = (await response.json()) as unknown as CGResponse<FundingRateHome[]>;
    return data;
  }
  return null;
}

export async function fetchOpenInterest(symbol: string) {
  const response = await fetch(`${CG_BASE_URL}/api/openInterest/info?symbol=${symbol}`);
  if (response.ok) {
    const data = (await response.json()) as unknown as CGResponse<IOpenInterestInfo[]>;
    return data;
  }
  return null;
}

export async function fetchPriceChange() {
  const response = await fetch(`${CG_BASE_URL}/api/futures/coins/priceChange?ex=all`);
  if (response.ok) {
    const data = (await response.json()) as unknown as CGResponse<IPriceChange[]>;
    return data;
  }
  return null;
}

export async function fetchCoinTickets(symbol: string) {
  const response = await fetch(`${CG_BASE_URL}/api/coin/tickers?symbol=${symbol}`);
  if (response.ok) {
    const data = (await response.json()) as unknown as CGResponse<Tick[]>;
    return data;
  }
  return null;
}

export async function fetchExchangeList() {
  const response = await fetch(`${CG_BASE_URL}/api/derivative/exchange/list`);
  if (response.ok) {
    const data = (await response.json()) as unknown as CGResponse<IExchangeInfo[]>;
    return data;
  }
  return null;
}
