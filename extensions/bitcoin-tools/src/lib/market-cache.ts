import { Cache } from "@raycast/api";
import { type MarketState, resolveMarketState } from "./market-data";

const MARKET_CACHE_KEY = "bsv-market-snapshot-v1";
const cache = new Cache();

export async function loadMarketState(): Promise<MarketState> {
  const state = await resolveMarketState(cache.get(MARKET_CACHE_KEY));
  if (!state.isStale && state.snapshot) {
    cache.set(MARKET_CACHE_KEY, JSON.stringify(state.snapshot));
  }
  return state;
}
