import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { loadMarketState } from "./lib/market-cache";
import { COINPAPRIKA_BSV_URL } from "./lib/market-data";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const integerCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    loadMarketState,
    [],
    { keepPreviousData: true },
  );
  const snapshot = data?.snapshot;

  const markdown = snapshot
    ? `# ${currency.format(snapshot.priceUsd)}

Bitcoin SV${data?.isStale ? " · Last known data" : ""}`
    : `# Market Data Unavailable

${data?.error ?? "Waiting for BSV market data…"}`;

  return (
    <Detail
      isLoading={isLoading && !snapshot}
      markdown={markdown}
      metadata={
        snapshot ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="24h Change"
              text={`${snapshot.percentChange24h >= 0 ? "+" : ""}${snapshot.percentChange24h.toFixed(2)}%`}
              icon={
                snapshot.percentChange24h >= 0 ? Icon.ArrowUp : Icon.ArrowDown
              }
            />
            <Detail.Metadata.Label
              title="24h Volume"
              text={integerCurrency.format(snapshot.volume24hUsd)}
            />
            <Detail.Metadata.Label
              title="Market Cap"
              text={integerCurrency.format(snapshot.marketCapUsd)}
            />
            {snapshot.blockHeight !== undefined ? (
              <Detail.Metadata.Label
                title="Block Height"
                text={snapshot.blockHeight.toLocaleString("en-US")}
              />
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Updated"
              text={new Date(snapshot.updatedAt).toLocaleString("en-US")}
            />
            <Detail.Metadata.Label
              title="Status"
              text={data?.isStale ? "Cached" : "Live"}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action.OpenInBrowser
            title="Open on CoinPaprika"
            url={COINPAPRIKA_BSV_URL}
          />
        </ActionPanel>
      }
    />
  );
}
