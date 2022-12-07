import { useCachedPromise, useFetch } from "@raycast/utils";
import Bitfinex from "./api";

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
  return useCachedPromise((currency) => rest.fundingOffers(currency) as Promise<any[]>, [currency]);
};

export const useFundingBalanceInfo = (currency: string) => {
  return useCachedPromise(
    (currency) => rest.calcAvailableBalance(currency, 0, 0, "FUNDING") as Promise<any>,
    [currency]
  );
};
