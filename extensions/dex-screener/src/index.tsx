import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

const DEX_API_URL = "https://api.dexscreener.io/latest/dex/search";

export default function Command() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<State>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchPairs() {
      setIsLoading(true);
      try {
        const resp = await axios.get(DEX_API_URL, {
          params: {
            q: token,
          },
        });
        setState({ items: resp.data.pairs });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      fetchPairs();
    }
  }, [token]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setToken}
      searchBarPlaceholder="Token, pair or address"
      navigationTitle="DEX Screener"
    >
      {state.items?.map((item, index) => (
        <List.Item
          key={index}
          title={`${item.baseToken.name} | $${item.baseToken.symbol}/$${item.quoteToken.symbol}`}
          subtitle={`${item.chainId}-${item.dexId}`}
          accessories={[{ text: `$${item.priceUsd}` }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface State {
  items?: Pair[];
  error?: Error;
}

interface Pair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: {
      buys: number;
      sells: number;
    };
    h1: {
      buys: number;
      sells: number;
    };
    h6: {
      buys: number;
      sells: number;
    };
    h24: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  pairCreatedAt?: number;
}
