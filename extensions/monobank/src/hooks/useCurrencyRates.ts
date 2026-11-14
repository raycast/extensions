import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { isSupportedRate, toCurrencyRate } from "../api/mappers";
import { getCurrencyRates } from "../api/monobank";
import { CurrencyRateResponse } from "../api/types";
import { RATES_TTL, STORAGE_KEYS } from "../data/constants";
import { getPreviousSnapshot, recordRates, toLocalDay } from "../services/rateHistory";
import { usePersistedResource } from "./usePersistedResource";

// The cache keeps the API format, so caches from earlier versions stay valid.
const initialValue: { rates: CurrencyRateResponse[] } = { rates: [] };

export function useCurrencyRates() {
  const { data, lastUpdated, isLoading, isError } = usePersistedResource({
    key: STORAGE_KEYS.rates,
    initialValue,
    ttl: RATES_TTL,
    fetch: async () => {
      const rates = (await getCurrencyRates()).filter(isSupportedRate);
      await recordRates(rates.map(toCurrencyRate));
      return { rates };
    },
  });

  const rates = useMemo(() => data.rates.map(toCurrencyRate), [data.rates]);
  // Undefined until rates have been loaded once.
  const updatedAt = data.rates.length ? lastUpdated : undefined;

  // Read again when new rates arrive, since the fetch may have saved today's snapshot.
  const { data: previous } = useCachedPromise(
    (time: number | undefined) => (time ? getPreviousSnapshot(toLocalDay(time)) : Promise.resolve(undefined)),
    [updatedAt],
  );

  return {
    data: rates,
    /** Unix milliseconds. */
    updatedAt,
    /** The rates of the newest earlier day, to show how much each rate changed. */
    previous,
    isLoading,
    isError,
  };
}
