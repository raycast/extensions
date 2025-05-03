import { ActionPanel, Action, List } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import EventSource from "eventsource";

interface ChainData {
  id: string;
  title: string;
  blockNumber: number;
  dataCount: number;
  gasCount: number;
  txCount: number;
  tps: string;
  gps: string;
  dps: string;
  chainCount?: number;
}

function formatTitle(title: string): string {
  return title
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/\d+$/, "")
    .replace(/Mainnet/i, "")
    .replace(/1v9rjalnat/i, "")
    .replace(/9u03waglau/i, "")
    .trim();
}

function padValue(value: string, width: number): string {
  return value.padStart(width, " ");
}

export default function Command() {
  const [items, setItems] = useState<ChainData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const latestDataRef = useRef<ChainData[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasReceivedDataRef = useRef(false);

  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      const { data, type } = event;
      const parsedData = JSON.parse(data);

      const newItem: ChainData = {
        id: type,
        title: formatTitle(type),
        blockNumber: parsedData.blockNumber,
        dataCount: parsedData.dataCount,
        gasCount: parsedData.gasCount,
        txCount: parsedData.txCount,
        tps: parsedData.tps,
        gps: parsedData.gps,
        dps: parsedData.dps,
      };

      latestDataRef.current = latestDataRef.current.filter((item) => item.id !== type);
      latestDataRef.current.push(newItem);

      hasReceivedDataRef.current = true;

      // Schedule an update if one isn't already scheduled
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          setItems(latestDataRef.current);
          timeoutRef.current = null;

          // Only set isLoading to false if we have enough data and minimum loading time has passed
          if (latestDataRef.current.length > 3 && !loadingTimeoutRef.current) {
            setIsLoading(false);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error processing SSE event:", error);
    }
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("https://tracker-api-gdesfolyga-uw.a.run.app/sse");

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      setIsLoading(false);
    };

    eventSource.addEventListener("message", handleEvent);

    const eventTypes = [
      "aevo-mainnet-prod-0",
      "ancient8-mainnet-0",
      "arbitrum-nova-mainnet",
      "arbitrum-one-mainnet",
      "base-mainnet",
      "blast-mainnet",
      "bob-mainnet-0",
      "clique-mainnet-0",
      "degen-mainnet-1",
      "donatuz-mainnet-0",
      "ebi-chain-mainnet",
      "ethereum-mainnet",
      "fraxtal-mainnet",
      "gold-mainnet-0",
      "gravity-mainnet-0",
      "ham-mainnet",
      "linea-mainnet",
      "lyra-mainnet-0",
      "mantle-mainnet",
      "metal-mainnet-0",
      "metis-mainnet",
      "mint-mainnet-0",
      "mode-mainnet-0",
      "onchain-9u03waglau",
      "optimism-mainnet",
      "orderly-mainnet-0",
      "pgn-mainnet-0",
      "polygon-zkevm-mainnet",
      "polynomial-mainnet-0",
      "proofofplay-apex-mainnet-0",
      "proofofplay-boss-mainnet",
      "rari-mainnet",
      "redstone-mainnet",
      "sanko-mainnet",
      "scroll-mainnet",
      "snaxchain-mainnet-0",
      "stack-mainnet-0",
      "superlumio-mainnet-0",
      "superposition-1v9rjalnat",
      "taiko-mainnet",
      "winr-mainnet-0",
      "xai-mainnet",
      "xchain-mainnet-0",
      "zksync-mainnet",
      "zora-mainnet-0",
    ];

    for (const type of eventTypes) {
      eventSource.addEventListener(type, handleEvent);
    }

    // Set a minimum loading time of 2 seconds
    loadingTimeoutRef.current = setTimeout(() => {
      loadingTimeoutRef.current = null;
      if (latestDataRef.current.length > 3) {
        setIsLoading(false);
      }
    }, 2000);

    // Set a timeout to show empty state if no data is received after 5 seconds
    const emptyStateTimeout = setTimeout(() => {
      if (!hasReceivedDataRef.current) {
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      eventSource.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      clearTimeout(emptyStateTimeout);
    };
  }, [handleEvent]);

  const { totalRow, vsEthereumRow } = useMemo(() => {
    const ethereumData = items.find((item) => item.id === "ethereum-mainnet");
    const total = items.reduce(
      (acc, item) => {
        if (item.id !== "ethereum-mainnet") {
          acc.txCount += item.txCount;
          acc.dataCount += item.dataCount;
          acc.gasCount += item.gasCount;
          acc.tps += Number.parseFloat(item.tps);
          acc.gps += Number.parseFloat(item.gps);
          acc.dps += Number.parseFloat(item.dps);
          acc.chainCount += 1;
        }
        return acc;
      },
      { txCount: 0, dataCount: 0, gasCount: 0, tps: 0, gps: 0, dps: 0, chainCount: 0 },
    );

    const calculateFactor = (totalValue: number, ethereumValue: number) => {
      return ethereumValue > 0 ? (totalValue / ethereumValue).toFixed(1) : "1";
    };

    const tpsFactor = calculateFactor(total.tps, Number.parseFloat(ethereumData?.tps || "0"));
    const gpsFactor = calculateFactor(total.gps, Number.parseFloat(ethereumData?.gps || "0"));
    const dpsFactor = calculateFactor(total.dps, Number.parseFloat(ethereumData?.dps || "0"));

    return {
      totalRow: {
        id: "total",
        title: "Total",
        blockNumber: 0,
        ...total,
        tps: total.tps.toFixed(1),
        gps: total.gps.toFixed(2),
        dps: total.dps.toFixed(2),
      },
      vsEthereumRow: {
        id: "vs-ethereum",
        title: "vs Ethereum",
        chainCount: 0,
        blockNumber: 0,
        txCount: 0,
        dataCount: 0,
        gasCount: 0,
        tps: `x${tpsFactor}`,
        gps: `x${gpsFactor}`,
        dps: `x${dpsFactor}`,
      },
    };
  }, [items]);

  const headerRow: ChainData = {
    id: "header",
    title: "Name",
    blockNumber: 0,
    dataCount: 0,
    gasCount: 0,
    txCount: 0,
    tps: "TPS",
    gps: "Mgas/s",
    dps: "KB/s",
  };

  const displayItems = useMemo(() => {
    const sortedItems = [...items].sort((a, b) => Number.parseFloat(b.tps) - Number.parseFloat(a.tps));
    const allItems = [headerRow, totalRow, vsEthereumRow, ...sortedItems];

    // Find the maximum length for each column
    const maxLengths = {
      tps: Math.max(...allItems.map((item) => item.tps.toString().length)),
      gps: Math.max(...allItems.map((item) => item.gps.toString().length)),
      dps: Math.max(...allItems.map((item) => item.dps.toString().length)),
    };

    // Pad the values in each item
    return allItems.map((item) => ({
      ...item,
      tps: padValue(item.tps.toString(), maxLengths.tps),
      gps: padValue(item.gps.toString(), maxLengths.gps),
      dps: padValue(item.dps.toString(), maxLengths.dps),
    }));
  }, [items, totalRow, vsEthereumRow]);

  return (
    <List isLoading={isLoading}>
      {!isLoading && items.length === 0 ? (
        <List.EmptyView title="No data received" description="Waiting for data from Rollup.wtf" />
      ) : (
        <List.Section title="Rollup Stats">
          {displayItems.map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              subtitle={
                item.id === "total"
                  ? `${item.chainCount} chains`
                  : item.id === "header"
                    ? "Block #"
                    : item.id === "vs-ethereum"
                      ? ""
                      : `${item.blockNumber}`
              }
              accessories={[
                { text: `${item.tps}`, tooltip: "Transactions Per Second" },
                { text: `${item.gps}`, tooltip: "Million Gas Per Second" },
                { text: `${item.dps}`, tooltip: "Kilobytes Per Second" },
              ]}
              actions={
                item.id !== "header" && item.id !== "vs-ethereum" ? (
                  <ActionPanel>
                    <Action.CopyToClipboard
                      content={`${item.title}\nBlock #: ${item.blockNumber}\nTx Count: ${item.txCount}\nData Count: ${item.dataCount}\nGas Count: ${item.gasCount}\nTPS: ${item.tps.trim()}\nGPS: ${item.gps.trim()}\nDPS: ${item.dps.trim()}`}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
