import { Action, ActionPanel, Cache, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { ageInDays, isStale, loadMarket, STALE_AFTER_DAYS } from "./lib/data";
import { longDate, money, pct, shortDate } from "./lib/format";
import type { MarketPayload, MarketSegment } from "./lib/types";

const cache = new Cache();

// The order the site reads them in, rather than whatever the payload happens
// to list first.
const PERIODS: { key: string; label: string }[] = [
  { key: "1m", label: "1 month" },
  { key: "3m", label: "3 months" },
  { key: "6m", label: "6 months" },
  { key: "1y", label: "1 year" },
];

export default function ShowMarketOverview() {
  const forceNextLoad = useRef(false);

  const { data, isLoading, revalidate, error } = usePromise(
    async () => {
      const force = forceNextLoad.current;
      forceNextLoad.current = false;
      const result = await loadMarket({ cache, force });
      if (result.servedFromCacheAfterFailure) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't refresh the market",
          message: `Showing data computed ${longDate(result.payload.generated)}`,
        });
      }
      return result;
    },
    [],
    { failureToastOptions: { title: "Couldn't load the market overview" } },
  );

  // Refresh must reach the network, not re-read the cache it is refreshing.
  const refresh = () => {
    forceNextLoad.current = true;
    revalidate();
  };

  const payload = data?.payload;
  const stale = payload ? isStale(payload.generated) : false;
  const offline = data?.servedFromCacheAfterFailure ?? false;
  let sectionTitle = "";
  if (payload) {
    // The detail pane is always open here, so the list column is narrow: the
    // long form truncated to "4 segments · data fro...September 21, 2026".
    sectionTitle = `${payload.segments.length} segments · ${shortDate(payload.generated)}`;
    if (offline) sectionTitle = `Offline · ${sectionTitle}`;
    if (stale) sectionTitle = `⚠ ${ageInDays(payload.generated)} days old · ${sectionTitle}`;
  }

  return (
    <List isLoading={isLoading} isShowingDetail={Boolean(payload)} searchBarPlaceholder="Filter segments">
      {error && !payload ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't load the market overview"
          description={`${error.message}. Check your connection, then try again.`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action.OpenInBrowser title="Open MemRadar" url="https://memradar.com" />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={sectionTitle}>
          {(payload?.segments ?? []).map((segment) => (
            <SegmentItem
              key={segment.segment}
              segment={segment}
              payload={payload as MarketPayload}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SegmentItem({
  segment,
  payload,
  onRefresh,
}: {
  segment: MarketSegment;
  payload: MarketPayload;
  onRefresh: () => void;
}) {
  const year = segment.periods["1y"];
  const stale = isStale(payload.generated);

  // One line a reader could paste into a message and have it still be true:
  // the figure, its window, its matched-set size and where it came from.
  const figure = [
    segment.label,
    year ? `${pct(year.pct_change)} year over year (${year.product_count} products)` : undefined,
    segment.median_price_usd !== undefined ? `median ${money(segment.median_price_usd)}` : undefined,
    segment.median_usd_per_gb !== undefined ? `${money(segment.median_usd_per_gb)}/GB` : undefined,
    `MemRadar, ${longDate(payload.generated)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const markdown = ["## How to read these", "", payload.method, "", "---", "", payload.notice, "", payload.attribution]
    .join("\n")
    .trim();

  return (
    <List.Item
      title={segment.label}
      icon={segment.segment.startsWith("ddr") ? Icon.MemoryChip : Icon.HardDrive}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              {segment.median_price_usd !== undefined ? (
                <List.Item.Detail.Metadata.Label title="Median price" text={money(segment.median_price_usd)} />
              ) : null}
              {segment.median_usd_per_gb !== undefined ? (
                <List.Item.Detail.Metadata.Label title="Median per GB" text={money(segment.median_usd_per_gb)} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              {PERIODS.map(({ key, label }) => {
                const period = segment.periods[key];
                if (!period) return null;
                return (
                  <List.Item.Detail.Metadata.Label
                    key={key}
                    title={label}
                    text={`${pct(period.pct_change)}  ·  ${period.product_count} products`}
                    icon={{
                      source: period.pct_change > 0 ? Icon.ArrowUp : period.pct_change < 0 ? Icon.ArrowDown : Icon.Dot,
                      tintColor:
                        period.pct_change > 0 ? Color.Red : period.pct_change < 0 ? Color.Green : Color.SecondaryText,
                    }}
                  />
                );
              })}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Data computed"
                text={longDate(payload.generated)}
                icon={stale ? { source: Icon.Warning, tintColor: Color.Orange } : undefined}
              />
              <List.Item.Detail.Metadata.Label
                title="Figures computed"
                text={longDate(payload.computed_at.slice(0, 10))}
              />
              {stale ? (
                <List.Item.Detail.Metadata.Label
                  title="Warning"
                  text={`More than ${STALE_AFTER_DAYS} days old; the site may have newer figures`}
                />
              ) : null}
              <List.Item.Detail.Metadata.Link title="Price index" target={payload.source} text="memradar.com" />
            </List.Item.Detail.Metadata>
          }
        />
      }
      accessories={year ? [{ text: pct(year.pct_change), tooltip: "Change over 1 year" }] : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Price Index" url={payload.source} icon={Icon.Globe} />
          <Action.CopyToClipboard title="Copy Figure" content={figure} />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
