import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useState } from "react";
import { useMarketTrends } from "./hooks/use-market-trends";
import { getMarketTrendMarkdown } from "./presentation/market-trend-detail";
import { formatShortDate, formatUsdPerGb, getTrendAccessory } from "./utils/format";

const SOURCE_URL = "https://ramradar.app";

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(false);
  const { data, isLoading, revalidate } = useMarketTrends();
  const series = data?.series ?? [];
  const toggleDetailTitle = showingDetail ? "Hide Details" : "Show Details";

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail} searchBarPlaceholder="Search RAM market trends">
      {!isLoading && series.length === 0 ? (
        <List.EmptyView
          icon={Icon.MemoryChip}
          title="No RAM market trends available"
          description="Try refreshing to load the latest DDR4 and DDR5 data."
          actions={
            <ActionPanel>
              <Action
                title={toggleDetailTitle}
                icon={Icon.Sidebar}
                onAction={() => setShowingDetail((value) => !value)}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Source" url={SOURCE_URL} shortcut={Keyboard.Shortcut.Common.Open} />
            </ActionPanel>
          }
        />
      ) : null}

      {series.map((entry) => (
        <List.Item
          key={entry.generation}
          icon={Icon.MemoryChip}
          title={entry.generation}
          subtitle={formatUsdPerGb(entry.latest.avgPricePerGb)}
          accessories={
            showingDetail
              ? undefined
              : [
                  getTrendAccessory(entry.changePercent),
                  { text: `${entry.latest.productCount} products` },
                  { text: formatShortDate(entry.latest.date) },
                ]
          }
          detail={
            showingDetail ? (
              <List.Item.Detail
                markdown={getMarketTrendMarkdown(entry)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Generation" text={entry.generation} />
                    <List.Item.Detail.Metadata.Label
                      title="Latest Avg Price"
                      text={formatUsdPerGb(entry.latest.avgPricePerGb)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Change vs Previous"
                      text={getTrendAccessory(entry.changePercent).text}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Products Tracked"
                      text={String(entry.latest.productCount)}
                    />
                    <List.Item.Detail.Metadata.Label title="Latest Date" text={formatShortDate(entry.latest.date)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Dataset Updated"
                      text={formatShortDate(data?.lastUpdated)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            ) : undefined
          }
          actions={
            <ActionPanel>
              <Action
                title={toggleDetailTitle}
                icon={Icon.Sidebar}
                onAction={() => setShowingDetail((value) => !value)}
              />
              <Action.OpenInBrowser title="Open Source" url={SOURCE_URL} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              <Action.CopyToClipboard
                title="Copy Latest Price"
                content={formatUsdPerGb(entry.latest.avgPricePerGb)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
