import { ActionPanel, Action, List } from "@raycast/api";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import EventSource from "eventsource";

interface BlobData {
  id: string;
  da: string;
  payment: string;
  blobsize: number;
  latency: number;
  price: number;
  tooltipData?: {
    [key: string]: {
      value: string;
      formatted: string;
    };
  };
}

function padValue(value: string, width: number): string {
  return value.padStart(width, " ");
}

function formatPrice(price: number): string {
  return price.toFixed(6);
}

export default function Command() {
  const [items, setItems] = useState<BlobData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsRef = useRef<BlobData[]>([]);

  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      const parsedData = JSON.parse(event.data);
      const newItem: BlobData = {
        id: parsedData.da,
        da: parsedData.da,
        payment: parsedData.payment,
        blobsize: parsedData.blobsize,
        latency: parsedData.latency,
        price: parsedData.price,
        tooltipData: parsedData.tooltipData,
      };

      itemsRef.current = itemsRef.current.filter((item) => item.id !== newItem.id);
      itemsRef.current.push(newItem);
      itemsRef.current.sort((a, b) => b.price - a.price);
    } catch (error) {
      console.error("Error processing blob SSE event:", error);
    }
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("https://tracker-api-gdesfolyga-uw.a.run.app/blobs/sse");

    eventSource.onopen = () => {
      setIsLoading(false);
    };

    eventSource.onerror = (error) => {
      console.error("Blob SSE connection error:", error);
      setIsLoading(false);
    };

    eventSource.onmessage = handleEvent;

    const specificEvents = [
      "Arb Calldata",
      "Eth Calldata",
      "Anytrust",
      "Eth 4844",
      "Base Calldata",
      "Celestia",
      "EigenDA",
    ];
    for (const eventType of specificEvents) {
      eventSource.addEventListener(eventType, handleEvent);
    }

    const intervalId = setInterval(() => {
      setItems([...itemsRef.current]);
    }, 1000);

    return () => {
      eventSource.close();
      clearInterval(intervalId);
    };
  }, [handleEvent]);

  const headerRow: BlobData = {
    id: "header",
    da: "DA Layer",
    payment: "",
    blobsize: 0,
    latency: 0,
    price: 0,
  };

  const displayItems = useMemo(() => {
    const allItems = [headerRow, ...items];

    const maxLengths = {
      da: Math.max(...allItems.map((item) => item.da.length)),
      blobsize: Math.max(...allItems.map((item) => item.blobsize.toLocaleString().length)),
      price: Math.max(...allItems.map((item) => formatPrice(item.price).length)) + 1,
      latency: Math.max(...allItems.map((item) => item.latency.toFixed(2).length)),
    };

    return allItems.map((item) => ({
      ...item,
      da: padValue(item.da, maxLengths.da),
      blobsize: padValue(item.blobsize.toLocaleString(), maxLengths.blobsize),
      price:
        item.id === "header"
          ? padValue(formatPrice(item.price), maxLengths.price)
          : padValue(`$${formatPrice(item.price)}`, maxLengths.price),
      latency: padValue(item.latency.toFixed(2), maxLengths.latency),
    }));
  }, [items]);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Blob Stats">
        {displayItems.map((item) => (
          <List.Item
            key={item.id}
            title={item.da}
            subtitle={item.id === "header" ? "Size (bytes)" : item.blobsize}
            accessories={[
              { text: item.id === "header" ? "$/kB" : item.price },
              { text: item.id === "header" ? "Latency (s)" : item.latency },
            ]}
            actions={
              item.id !== "header" ? (
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={`DA: ${item.da.trim()}\nSize: ${item.blobsize} bytes\n$/kB: ${item.price}\nPayment: ${item.payment}\nLatency: ${item.latency} seconds`}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        ))}
      </List.Section>
      {displayItems.length === 1 && !isLoading && (
        <List.EmptyView title="No data received" description="Waiting for data from Rollup.wtf" />
      )}
    </List>
  );
}
