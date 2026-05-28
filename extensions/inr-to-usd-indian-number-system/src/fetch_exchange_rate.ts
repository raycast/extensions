import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { hardCodedData } from "./script";

const EXCHANGE_API = "https://api.exchangerate-api.com/v4/latest/USD";

export function useExchangeRate() {
  const { data, isLoading } = useFetch<{ rates: { INR: number } }>(
    EXCHANGE_API,
    {
      keepPreviousData: true,
    },
  );
  const rate = data?.rates?.INR ?? hardCodedData.exchangeRate;
  const lastUpdated = useMemo(() => (data ? new Date() : null), [data]);
  return { rate, isLoading, lastUpdated };
}
