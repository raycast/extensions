import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

interface Preferences {
  refreshInterval: string;
  defaultFormat: "sats" | "btc" | "usd";
}

type PriceFormat = "sats" | "btc" | "usd";

export default function Command() {
  const { refreshInterval, defaultFormat } = getPreferenceValues<Preferences>();
  const [price, setPrice] = useState("Loading...");
  const [format, setFormat] = useState<PriceFormat>(defaultFormat);
  const [rawPrice, setRawPrice] = useState<number | null>(null);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);

  const formatPrice = (rawLibrePrice: number, format: PriceFormat, btcUsdPrice: number | null) => {
    switch (format) {
      case "sats": {
        return `${Math.round(rawLibrePrice * 10000000000).toLocaleString()} sats`;
      }
      case "btc": {
        return `₿${rawLibrePrice.toFixed(10)}`;
      }
      case "usd": {
        if (btcUsdPrice === null) return "USD price unavailable";
        const usdPrice = rawLibrePrice * btcUsdPrice;
        return `$${usdPrice.toFixed(6)}`;
      }
      default:
        return "Invalid format";
    }
  };

  const fetchPrice = async () => {
    try {
      const response = await fetch("https://lb.libre.org/v1/chain/get_table_rows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          json: true,
          code: "chainlink",
          scope: "chainlink",
          table: "feed",
          limit: 100,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonResponse = await response.json();
      const librePrice = jsonResponse?.rows?.find((row) => row.pair === "librebtc")?.price;
      const btcUsdPrice = jsonResponse?.rows?.find((row) => row.pair === "btcusd")?.price;

      if (librePrice) {
        const librePriceNum = parseFloat(librePrice);
        const btcUsdPriceNum = btcUsdPrice ? parseFloat(btcUsdPrice) : null;
        setRawPrice(librePriceNum);
        setBtcPrice(btcUsdPriceNum);
        setPrice(formatPrice(librePriceNum, format, btcUsdPriceNum));
      } else {
        setPrice("No Data");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Fetch error:", error.message);
      }
      setPrice("Error");
    }
  };

  useEffect(() => {
    if (rawPrice !== null) {
      setPrice(formatPrice(rawPrice, format, btcPrice));
    }
  }, [format]);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, parseInt(refreshInterval) * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <MenuBarExtra icon="libre.svg" title={price} isLoading={price === "Loading..."}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Show as Sats"
          onAction={() => setFormat("sats")}
          shortcut={{ key: "s", modifiers: ["cmd"] }}
        />
        <MenuBarExtra.Item
          title="Show as BTC"
          onAction={() => setFormat("btc")}
          shortcut={{ key: "b", modifiers: ["cmd"] }}
        />
        <MenuBarExtra.Item
          title="Show as USD"
          onAction={() => setFormat("usd")}
          shortcut={{ key: "u", modifiers: ["cmd"] }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" onAction={fetchPrice} shortcut={{ key: "r", modifiers: ["cmd"] }} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
