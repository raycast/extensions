import { Action, ActionPanel, Color, Icon, Image, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getLatestQuoteById, searchAssets } from "./coinmarketcap";
import { formatCurrency, formatPercent } from "./format";
import { AssetSearchResult, Preferences, Quote } from "./types";

function assetIcon(asset: AssetSearchResult): Image.ImageLike {
  return {
    source: `https://s2.coinmarketcap.com/static/img/coins/64x64/${asset.id}.png`,
    fallback: Icon.Coins,
    mask: Image.Mask.Circle,
  };
}

export default function Command() {
  const { baseCurrency } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [quotes, setQuotes] = useState<Record<number, Quote>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (searchText.trim().length < 2) {
        setResults([]);
        setQuotes({});
        return;
      }

      setIsLoading(true);
      try {
        const assets = await searchAssets(searchText);
        const topAssets = assets.slice(0, 12);
        const loadedQuotes = await Promise.all(
          topAssets.map(
            async (asset) =>
              [asset.id, await getLatestQuoteById(asset.id, baseCurrency).catch(() => undefined)] as const,
          ),
        );

        if (isMounted) {
          setResults(assets);
          setQuotes(
            loadedQuotes.reduce<Record<number, Quote>>((acc, [id, quote]) => {
              if (quote) {
                acc[id] = quote;
              }
              return acc;
            }, {}),
          );
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Asset Search Failed",
          message: error instanceof Error ? error.message : undefined,
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    const timeout = setTimeout(load, 250);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [baseCurrency, searchText]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Asset"
      searchBarPlaceholder="Search by name, symbol, or slug"
      onSearchTextChange={setSearchText}
      throttle
    >
      <List.EmptyView
        title={searchText.trim().length < 2 ? "Search CoinMarketCap Assets" : "No Assets Found"}
        description="Type at least two characters."
      />
      {results.map((asset) => {
        const quote = quotes[asset.id];
        const change = quote?.percentChange24h;

        return (
          <List.Item
            key={asset.id}
            icon={assetIcon(asset)}
            title={`${asset.name} (${asset.symbol})`}
            accessories={[
              ...(quote ? [{ text: formatCurrency(quote.price, baseCurrency), tooltip: "Price" }] : []),
              ...(change !== undefined
                ? [
                    {
                      text: formatPercent(change),
                      icon: { source: Icon.Circle, tintColor: change >= 0 ? Color.Green : Color.Red },
                      tooltip: "24h change",
                    },
                  ]
                : []),
              ...(asset.rank ? [{ text: `#${asset.rank}` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Symbol" content={asset.symbol} />
                <Action.CopyToClipboard title="Copy CoinMarketCap ID" content={String(asset.id)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
