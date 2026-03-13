import { Action, ActionPanel, Icon, LaunchProps, List, popToRoot } from "@raycast/api";
import { useHashrate } from "./useHashrate";
import { GPUEstimate } from "./types";
import { useEffect } from "react";
import { showFailureToast, useCachedState } from "@raycast/utils";

export default function GPUEstimates(props: LaunchProps<{ arguments: Arguments.GpuEstimates }>) {
  const { power_cost } = props.arguments;

  const [isShowingDetail, setIsShowingDetail] = useCachedState("detail_gpu_estimates", true);
  const [lastUpdated, setLastUpdate] = useCachedState<Date>("last_updated_gpu_estimates", new Date());
  const [lastPowerCost, setLastPowerCost] = useCachedState("last_power_cost_gpu_estimates", "");
  const {
    isLoading,
    data: estimates,
    revalidate,
  } = useHashrate<GPUEstimate>("gpuEstimates", {
    params: {
      powerCost: power_cost,
    },
    initialData: {},
  });

  function refresh() {
    revalidate();
    setLastUpdate(new Date());
  }
  async function handleError(message: string) {
    await showFailureToast(message);
    await popToRoot();
  }
  function formatAsUSD(value: number) {
    return Intl.NumberFormat("en", { currency: "USD", style: "currency" }).format(value);
  }
  useEffect(() => {
    if (!Number(power_cost)) handleError("Power Cost must be a number!");
    else if (Number(power_cost) < 0 || Number(power_cost) > 1) handleError("Power Cost must be between 0 and 1.00!");
    else if (!Object.keys(estimates).length) refresh();
    else if (lastPowerCost !== power_cost) {
      setLastPowerCost(power_cost);
      refresh();
    }
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail} searchBarPlaceholder="Search GPUs">
      <List.Section
        title={`${Object.keys(estimates).length} estimates | cost: ${power_cost} | last_update: ${lastUpdated.toLocaleDateString()}`}
      >
        {Object.entries(estimates).map(([key, estimate]) => (
          <List.Item
            key={key}
            icon={Icon.Dot}
            title={estimate.device.name}
            subtitle={estimate.device.brand}
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
                    <List.Item.Detail.Metadata.Label title="Highest Profit" />
                    <List.Item.Detail.Metadata.Label title="Coin" text={estimate.profit.coin} />
                    <List.Item.Detail.Metadata.Label title="Revenue" text={formatAsUSD(estimate.profit.revenueUSD)} />
                    <List.Item.Detail.Metadata.Label title="Profit" text={formatAsUSD(estimate.profit.profitUSD)} />

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Highest Revenue" />
                    <List.Item.Detail.Metadata.Label title="Coin" text={estimate.revenue.coin} />
                    <List.Item.Detail.Metadata.Label title="Revenue" text={formatAsUSD(estimate.revenue.revenueUSD)} />
                    <List.Item.Detail.Metadata.Label title="Profit" text={formatAsUSD(estimate.revenue.profitUSD)} />

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Highest Profit 24H" />
                    <List.Item.Detail.Metadata.Label title="Coin" text={estimate.profit24.coin} />
                    <List.Item.Detail.Metadata.Label
                      title="Revenue"
                      text={formatAsUSD(estimate.profit24.revenueUSD24)}
                    />
                    <List.Item.Detail.Metadata.Label title="Profit" text={formatAsUSD(estimate.profit24.profitUSD24)} />

                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Highest Revenue 24H" />
                    <List.Item.Detail.Metadata.Label title="Coin" text={estimate.revenue24.coin} />
                    <List.Item.Detail.Metadata.Label
                      title="Revenue"
                      text={formatAsUSD(estimate.revenue24.revenueUSD24)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Profit"
                      text={formatAsUSD(estimate.revenue24.profitUSD24)}
                    />
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
