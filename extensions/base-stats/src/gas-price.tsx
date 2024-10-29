import { useEffect, useState, useCallback } from "react";
import { Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  apiKey: string;
}

interface GasPrice {
  loading: boolean;
  error?: string;
  price?: number;
}

interface BaseScanResponse {
  status?: string;
  message?: string;
  result?: string;
  jsonrpc?: string;
  id?: number;
}

async function fetchGasPrice(apiKey: string): Promise<number> {
  try {
    const response = await fetch(`https://api.basescan.org/api?module=proxy&action=eth_gasPrice&apikey=${apiKey}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as BaseScanResponse;

    if (!data.result) {
      throw new Error(`Invalid response format: ${JSON.stringify(data)}`);
    }

    // Validate hex string format
    if (!/^0x[0-9a-fA-F]+$/.test(data.result)) {
      throw new Error(`Invalid hex format received: ${data.result}`);
    }
    const priceInWei = Number.parseInt(data.result.substring(2), 16);
    if (Number.isNaN(priceInWei)) {
      throw new Error(`Failed to parse hex value: ${data.result}`);
    }

    return priceInWei / 1e6;
  } catch (error) {
    console.error("Error fetching gas price:", error);
    throw error;
  }
}

export default function Command() {
  const [gasPrice, setGasPrice] = useState<GasPrice>({ loading: true });
  const { apiKey } = getPreferenceValues<Preferences>();

  const updateGasPrice = useCallback(async () => {
    if (!apiKey) {
      setGasPrice({ loading: false, error: "API key not set" });
      return;
    }

    try {
      const price = await fetchGasPrice(apiKey);
      setGasPrice({ loading: false, price });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch gas price";
      console.error("Gas price update failed:", error);
      setGasPrice({ loading: false, error: errorMessage });
    }
  }, [apiKey]);

  useEffect(() => {
    updateGasPrice();
  }, [updateGasPrice]);

  if (gasPrice.error) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} title="Error" tooltip={gasPrice.error}>
        <MenuBarExtra.Item title="Open Settings" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={"base.png"}
      isLoading={gasPrice.loading}
      title={gasPrice.price ? `${gasPrice.price.toFixed(2)} MWei` : "Loading..."}
    >
      <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={updateGasPrice} />
      <MenuBarExtra.Item title="Settings" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
    </MenuBarExtra>
  );
}
