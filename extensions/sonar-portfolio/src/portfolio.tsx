import { List, ActionPanel, Action, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api } from "./api";
import { formatCurrency, formatPercent, gainColor } from "./utils";

export default function Portfolio() {
  const { data, isLoading, revalidate } = useCachedPromise(api.deepdive);

  const cur = data?.reportingCurrency ?? "USD";

  const items: Array<{ title: string; icon: Icon; value: string; detail: React.ReactNode }> = [];

  if (data) {
    items.push({
      title: "Total Value",
      icon: Icon.BankNote,
      value: formatCurrency(data.totalValue, cur),
      detail: (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Total Value" text={formatCurrency(data.totalValue, cur)} />
              <List.Item.Detail.Metadata.Label title="Cost Basis" text={formatCurrency(data.totalCostBasis, cur)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Unrealized P&L" text={`${formatCurrency(data.totalUnrealizedGainLoss, cur)} (${formatPercent(data.totalUnrealizedGainLossPercent)})`} />
              <List.Item.Detail.Metadata.Label title="Realized P&L" text={formatCurrency(data.totalRealizedGainLoss, cur)} />
              <List.Item.Detail.Metadata.Label title="Dividends" text={formatCurrency(data.totalDividends, cur)} />
            </List.Item.Detail.Metadata>
          }
        />
      ),
    });

    items.push({
      title: "Holdings",
      icon: Icon.List,
      value: String(data.holdingCount),
      detail: (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Holdings" text={String(data.holdingCount)} />
              <List.Item.Detail.Metadata.Label title="Top 5 Concentration" text={`${data.top5Concentration.toFixed(1)}%`} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Top Holdings" />
              {data.topHoldings.map((h) => (
                <List.Item.Detail.Metadata.Label
                  key={h.name}
                  title={`  ${h.ticker ?? h.name}`}
                  text={`${h.weight.toFixed(1)}% · ${formatCurrency(h.value, cur)}`}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      ),
    });

    items.push({
      title: "Unrealized P&L",
      icon: Icon.ArrowUpDown,
      value: `${formatCurrency(data.totalUnrealizedGainLoss, cur)} (${formatPercent(data.totalUnrealizedGainLossPercent)})`,
      detail: (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Performance" />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Unrealized P&L" text={formatCurrency(data.totalUnrealizedGainLoss, cur)} />
              <List.Item.Detail.Metadata.Label title="Unrealized %" text={formatPercent(data.totalUnrealizedGainLossPercent)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Realized P&L" text={formatCurrency(data.totalRealizedGainLoss, cur)} />
              <List.Item.Detail.Metadata.Label title="Dividends" text={formatCurrency(data.totalDividends, cur)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Total Return"
                text={formatCurrency(data.totalUnrealizedGainLoss + data.totalRealizedGainLoss + data.totalDividends, cur)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      ),
    });

    items.push({
      title: "Sectors",
      icon: Icon.PieChart,
      value: `${data.sectorAllocation.length} sectors`,
      detail: (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Sector Allocation" />
              <List.Item.Detail.Metadata.Separator />
              {data.sectorAllocation.slice(0, 10).map((s) => (
                <List.Item.Detail.Metadata.Label
                  key={s.name}
                  title={s.name}
                  text={`${s.percentage.toFixed(1)}% · ${formatCurrency(s.value, cur)}`}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      ),
    });

    items.push({
      title: "Diversification",
      icon: Icon.Shield,
      value: `${data.diversification.overall}/100 — ${data.diversification.label}`,
      detail: (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Diversification Score" text={`${data.diversification.overall}/100`} />
              <List.Item.Detail.Metadata.Label title="Rating" text={data.diversification.label} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Top 5 Concentration" text={`${data.top5Concentration.toFixed(1)}%`} />
              <List.Item.Detail.Metadata.Label title="Sector Count" text={String(data.sectorAllocation.length)} />
            </List.Item.Detail.Metadata>
          }
        />
      ),
    });
  }

  const baseUrl = getPreferenceValues<Preferences>().baseUrl.replace(/\/$/, "");

  return (
    <List isLoading={isLoading} isShowingDetail>
      {items.map((item) => (
        <List.Item
          key={item.title}
          icon={item.icon}
          title={item.title}
          accessories={[{ text: item.value }]}
          detail={item.detail}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Sonar" url={`${baseUrl}/dashboard`} icon={Icon.Globe} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
