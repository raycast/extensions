import { Icon, LaunchType, launchCommand, MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadMarketState } from "./lib/market-cache";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadMarketState, []);
  const snapshot = data?.snapshot;
  const price = snapshot ? snapshot.priceUsd.toFixed(2) : undefined;
  const blockHeight = snapshot?.blockHeight?.toLocaleString("en-US");
  const tooltip = snapshot
    ? `1 BSV = $${price}${blockHeight ? ` · Block ${blockHeight}` : ""}${data?.isStale ? " · Last known data" : ""}`
    : "BSV market data is temporarily unavailable";

  return (
    <MenuBarExtra
      tooltip={tooltip}
      title={price ? `$${price}` : "BSV"}
      isLoading={isLoading && !snapshot}
    >
      <MenuBarExtra.Item
        title="View BSV Market Data"
        icon={Icon.LineChart}
        onAction={() =>
          launchCommand({
            name: "bitcoin-price",
            type: LaunchType.UserInitiated,
          })
        }
      />
      {snapshot ? (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title={`Price: $${price}`} />
          <MenuBarExtra.Item
            title={`24h Change: ${snapshot.percentChange24h >= 0 ? "+" : ""}${snapshot.percentChange24h.toFixed(2)}%`}
          />
          {blockHeight ? (
            <MenuBarExtra.Item title={`Block Height: ${blockHeight}`} />
          ) : null}
        </>
      ) : null}
      {data?.isStale ? (
        <MenuBarExtra.Item
          title={
            snapshot ? "Showing Last Known Data" : "Market Data Unavailable"
          }
          subtitle={data.error}
          icon={Icon.Warning}
        />
      ) : null}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
      />
    </MenuBarExtra>
  );
}
