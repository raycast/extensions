import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useHashrate } from "./useHashrate";
import { Coin } from "./types";
import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";

export default function Coins() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("detail_coins", false);
  const [lastUpdated, setLastUpdate] = useCachedState<Date>("last_updated_coins", new Date());
  const {
    isLoading,
    data: coins,
    revalidate,
  } = useHashrate<Coin[]>("coins", {
    initialData: [],
  });

  function refresh() {
    revalidate();
    setLastUpdate(new Date());
  }
  useEffect(() => {
    if (!coins.length) refresh();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search coins">
      <List.Section title={`${coins.length} coins | last_update: ${lastUpdated.toLocaleDateString()}`}>
        {coins.map((coin) => (
          <List.Item
            key={coin.coin}
            icon={Icon.Coin}
            title={coin.coin + (isShowingDetail ? "" : ` - ${coin.name}`)}
            subtitle={coin.algo}
            accessories={[{ text: `$${coin.usdPrice}` }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarRight}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action icon={Icon.Redo} title="Refresh" onAction={refresh} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Coin" text={coin.coin} />
                    <List.Item.Detail.Metadata.Label title="Name" text={coin.name} />
                    <List.Item.Detail.Metadata.Label title="Algo" text={coin.algo} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="USD Price" text={coin.usdPrice} />
                    <List.Item.Detail.Metadata.Label title="USD Price 1h" text={coin.usdPrice1h} />
                    <List.Item.Detail.Metadata.Label title="USD Price 24h" text={coin.usdPrice24h} />
                    <List.Item.Detail.Metadata.Label title="USD Price 7d" text={coin.usdPrice7d} />
                    <List.Item.Detail.Metadata.Label title="USD Price 30d" text={coin.usdPrice30d} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Coin Estimate" text={coin.coinEstimate} />
                    <List.Item.Detail.Metadata.Label title="Coin EstimateUnit" text={coin.coinEstimateUnit} />
                    <List.Item.Detail.Metadata.Label title="Coin Estimate1h" text={coin.coinEstimate1h} />
                    <List.Item.Detail.Metadata.Label title="Coin Estimate24h" text={coin.coinEstimate24h} />
                    <List.Item.Detail.Metadata.Label title="Coin Estimate7d" text={coin.coinEstimate7d} />
                    <List.Item.Detail.Metadata.Label title="Coin Estimate30d" text={coin.coinEstimate30d} />
                    <List.Item.Detail.Metadata.Label title="Coin EstimateAvg30d" text={coin.coinEstimateAvg30d} />
                    <List.Item.Detail.Metadata.Label title="USD Estimate" text={coin.usdEstimate} />
                    <List.Item.Detail.Metadata.Label title="USD Estimate1h" text={coin.usdEstimate1h} />
                    <List.Item.Detail.Metadata.Label title="USD Estimate24h" text={coin.usdEstimate24h} />
                    <List.Item.Detail.Metadata.Label title="USD Estimate7d" text={coin.usdEstimate7d} />
                    <List.Item.Detail.Metadata.Label title="USD Estimate30d" text={coin.usdEstimate30d} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Network Hashrate" text={coin.networkHashrate} />
                    <List.Item.Detail.Metadata.Label title="Network Difficulty" text={coin.networkDifficulty} />
                    <List.Item.Detail.Metadata.Label title="Emission" text={coin.emission} />
                    <List.Item.Detail.Metadata.Label title="EmissionUSD" text={coin.emissionUSD} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
