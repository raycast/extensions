import { useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { LocalStorage } from "@raycast/api";

const EXCHANGE_API = "https://api.exchangerate-api.com/v4/latest/USD";
const CACHE_KEY = "lastExchangeRate";
const CACHE_TIME_KEY = "lastExchangeRateTime";
const INITIAL_RATE = 96.05;

export function useExchangeRate() {
  const [cachedRate, setCachedRate] = useState<number>(INITIAL_RATE);
  const [cachedTime, setCachedTime] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      LocalStorage.getItem<string>(CACHE_KEY),
      LocalStorage.getItem<string>(CACHE_TIME_KEY),
    ]).then(([storedRate, storedTime]) => {
      if (!mounted) return;
      if (storedRate) {
        const parsed = parseFloat(storedRate);
        if (Number.isFinite(parsed)) setCachedRate(parsed);
      }
      if (storedTime) setCachedTime(new Date(storedTime));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const { data, isLoading } = useFetch<{ rates: { INR: number } }>(
    EXCHANGE_API,
    {
      keepPreviousData: true,
    },
  );

  const rate = data?.rates?.INR ?? cachedRate;
  const lastUpdated = useMemo(
    () => (data ? new Date() : cachedTime),
    [data, cachedTime],
  );

  useEffect(() => {
    if (data?.rates?.INR) {
      const now = new Date().toISOString();
      LocalStorage.setItem(CACHE_KEY, data.rates.INR.toString());
      LocalStorage.setItem(CACHE_TIME_KEY, now);
    }
  }, [data]);

  return { rate, isLoading, lastUpdated };
}
