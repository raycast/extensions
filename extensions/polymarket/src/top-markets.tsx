import { List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Ticker } from "./types";
import { POLY_GAMMA_URL } from "./constants";
import { EventListItem } from "./common";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [tickers, setTickers] = useState<Ticker[]>([]);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const response = await fetch(
          POLY_GAMMA_URL +
            "events?limit=50&active=true&archived=false&closed=false&order=volume24hr&ascending=false&offset=0",
        );

        if (!response.ok) {
          throw new Error("Failed to fetch markets");
        }

        const data = (await response.json()) as Ticker[];
        setTickers(data.sort((a, b) => b.volume24hr - a.volume24hr));
      } catch (error) {
        setTickers([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch markets",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTickers();
  }, []);

  return (
    <List isLoading={isLoading}>
      {tickers.map((ticker) => (
        <EventListItem ticker={ticker} key={ticker.slug} />
      ))}
    </List>
  );
}
