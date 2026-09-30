import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

interface GasPrice {
  gas_type: string;
  slow_usd: string;
  normal_usd: string;
  fast_usd: string;
}

export function useGasPrices() {
  const [gasPrices, setGasPrices] = useState<GasPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGasPrices() {
      try {
        const response = await fetch("https://dropscapital.com/api/widgets/eth-gas/");
        const data = (await response.json()) as GasPrice[];
        setGasPrices(data);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch gas prices");
      } finally {
        setIsLoading(false);
      }
    }

    fetchGasPrices();
  }, []);

  return { gasPrices, isLoading };
}
