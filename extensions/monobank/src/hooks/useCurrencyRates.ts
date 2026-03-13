import { useEffect, useState } from "react";
import api from "../api";
import { RateResponse } from "../types";
import { useLocalStorage } from "./useLocalStorage";

import { filterRates } from "../utils";

interface LocalStorageRatesData {
  rates: RateResponse[];
  lastUpdated: number;
}

export function useCurrencyRates() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const {
    data,
    setData,
    isLoading: isLoadingFromLS,
  } = useLocalStorage<LocalStorageRatesData>("rates", { rates: [], lastUpdated: 0 });

  useEffect(() => {
    if (isLoadingFromLS) return;

    const now = Date.now();
    if (now - data.lastUpdated <= 1000 * 60 * 60 * 24) return;

    fetchRates().then((rates) => {
      const filteredRates = filterRates(rates);
      setData({
        rates: filteredRates,
        lastUpdated: now,
      });
    });
  }, [isLoadingFromLS]);

  async function fetchRates() {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await api.get<RateResponse[]>("/bank/currency");
      return response.data;
    } catch (error) {
      console.error(error);
      setIsError(true);
      return data.rates.length ? data.rates : [];
    } finally {
      setIsLoading(false);
    }
  }

  return {
    data: data.rates,
    isLoading: isLoading || isLoadingFromLS,
    isError,
  };
}
