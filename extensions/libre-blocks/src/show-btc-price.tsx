import { Icon, MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";

interface Preferences {
  refreshInterval: string;
}

export default function Command() {
  const { refreshInterval } = getPreferenceValues<Preferences>();
  const [price, setPrice] = useState("Loading...");

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
      const btcPrice = jsonResponse?.rows?.[0]?.price;

      if (btcPrice) {
        const priceNum = parseFloat(btcPrice);
        setPrice(`$${priceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
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
    fetchPrice();
    const interval = setInterval(fetchPrice, parseInt(refreshInterval) * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <MenuBarExtra 
      icon="btc.svg"
      title={price} 
      isLoading={price === "Loading..."}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item 
          title="Refresh" 
          onAction={fetchPrice}
          shortcut={{ key: "r", modifiers: ["cmd"] }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
