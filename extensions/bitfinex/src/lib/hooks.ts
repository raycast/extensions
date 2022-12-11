import { useCachedPromise, useCachedState, useFetch } from "@raycast/utils";
import Bitfinex, { calcAvailableBalance, getFundingOffers } from "./api";
import { ACTIVE_OFFERS_CACHE_KEY, CACHE_NAMESPACE } from "./constants";

const rest = Bitfinex.rest();

export const useFundingInterests = () => {
  return useCachedPromise(
    () =>
      rest.ledgers({
        category: 28, // Margin funding interests
      }) as Promise<any[]>
  );
};

export const useFundingStatsHistory = (query: string) => {
  return useFetch<any[]>(query);
};

export const useFundingCredits = (currency: string) => {
  return useCachedPromise((currency) => rest.fundingCredits(currency) as Promise<any[]>, [currency]);
};

export const useFundingOffers = (currency: string) => {
  return useCachedPromise((currency) => getFundingOffers(currency), [currency]);
};

export const useFundingBalanceInfo = (currency: string) => {
  return useCachedPromise((currency) => calcAvailableBalance(currency) as Promise<any>, [currency]);
};

export const useCachedActiveOffers = (activeOffers?: any[]) => {
  return useCachedState(ACTIVE_OFFERS_CACHE_KEY, activeOffers, {
    cacheNamespace: CACHE_NAMESPACE,
  });
};
