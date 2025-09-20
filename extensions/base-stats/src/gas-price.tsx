import { useState, useEffect } from "react";
import { Icon, MenuBarExtra, openCommandPreferences, getPreferenceValues, Cache } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  apiKey: string;
}

interface BaseScanResponse {
  jsonrpc: string;
  id: number;
  result: string;
}

const cache = new Cache();
const PRICE_CACHE_KEY = "base-gas-price";

async function fetchGasPrice(apiKey: string): Promise<number> {
  try {
    console.log("Fetching gas price...");
    const response = await fetch(`https://api.basescan.org/api?module=proxy&action=eth_gasPrice&apikey=${apiKey}`);

    const data = (await response.json()) as BaseScanResponse;
    console.log("Response:", data);

    if (!data.result) {
      throw new Error("Invalid response");
    }

    const priceInWei = Number.parseInt(data.result.substring(2), 16);
    const finalPrice = priceInWei / 1e6;
    console.log("Price:", finalPrice.toFixed(0), "MWei");

    return finalPrice;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export default function Command(): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const { apiKey } = getPreferenceValues<Preferences>();
  const [displayPrice, setDisplayPrice] = useState(() => cache.get(PRICE_CACHE_KEY) || "");

  useEffect(() => {
    const updatePrice = async () => {
      try {
        const newPrice = await fetchGasPrice(apiKey);
        const newPriceString = `${newPrice.toFixed(0)} MWei`;

        if (newPriceString !== cache.get(PRICE_CACHE_KEY)) {
          cache.set(PRICE_CACHE_KEY, newPriceString);
          setDisplayPrice(newPriceString);
        }
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch gas price");
      } finally {
        setIsLoading(false);
      }
    };

    void updatePrice();
  }, [apiKey]);

  return (
    <MenuBarExtra
      icon={error ? Icon.ExclamationMark : "base.png"}
      title={displayPrice}
      tooltip={error}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        title={error ? "Open Settings" : "Settings"}
        icon={Icon.Gear}
        onAction={openCommandPreferences}
      />
    </MenuBarExtra>
  );
}
