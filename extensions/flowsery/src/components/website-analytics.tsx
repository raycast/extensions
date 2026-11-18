import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { api } from "../lib/api";
import { showApiError } from "../lib/feedback";
import {
  dashboardUrl,
  formatCount,
  formatPercent,
  issuesUrl,
  overviewRows,
  RangeId,
  RANGES,
  websiteName,
} from "../lib/format";
import { loadWebsiteReport } from "../lib/report";
import { BreakdownRow, Website } from "../lib/types";

type WebsiteActionsProps = {
  website: Website;
  copyTitle: string;
  copyValue: string;
  onRefresh: () => void;
};

function WebsiteActions({ website, copyTitle, copyValue, onRefresh }: WebsiteActionsProps) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Dashboard" url={dashboardUrl(website)} />
      <Action.OpenInBrowser title="Open Issues" url={issuesUrl(website)} />
      <Action.CopyToClipboard title={copyTitle} content={copyValue} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}

type BreakdownSectionProps = {
  title: string;
  icon: Icon;
  rows: BreakdownRow[];
  website: Website;
  onRefresh: () => void;
};

function BreakdownSection({ title, icon, rows, website, onRefresh }: BreakdownSectionProps) {
  return (
    <List.Section title={title}>
      {rows.map((row) => (
        <List.Item
          key={`${title}-${row.value}`}
          title={row.value}
          icon={row.iconUrl ? ({ source: row.iconUrl, fallback: icon } satisfies Image.ImageLike) : icon}
          accessories={[
            ...(row.percentage === undefined ? [] : [{ text: formatPercent(row.percentage) }]),
            { text: formatCount(row.visitors), icon: Icon.TwoPeople, tooltip: "Visitors" },
          ]}
          actions={
            <WebsiteActions website={website} copyTitle="Copy Value" copyValue={row.value} onRefresh={onRefresh} />
          }
        />
      ))}
    </List.Section>
  );
}

export function WebsiteAnalytics({ website }: { website: Website }) {
  const [rangeId, setRangeId] = useState<RangeId>("7d");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, isLoading, revalidate } = useCachedPromise(
    (selectedWebsite: Website, selectedRange: RangeId, selectedTimezone: string) =>
      loadWebsiteReport(api(), selectedWebsite, selectedRange, new Date(), selectedTimezone),
    [website, rangeId, timezone],
    { keepPreviousData: true, onError: (error) => showApiError("Could Not Load Analytics", error) },
  );
  const metrics = overviewRows(data?.overview, website.currency);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={websiteName(website)}
      searchBarPlaceholder={`Filter ${websiteName(website)}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Period" storeValue defaultValue="7d" onChange={(value) => setRangeId(value as RangeId)}>
          {RANGES.map((range) => (
            <List.Dropdown.Item key={range.id} title={range.title} value={range.id} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Overview">
        {data?.liveVisitors !== undefined && (
          <List.Item
            title="Live Visitors"
            icon={Icon.CircleProgress100}
            accessories={[{ text: formatCount(data.liveVisitors) }]}
            actions={
              <WebsiteActions
                website={website}
                copyTitle="Copy Value"
                copyValue={String(data.liveVisitors)}
                onRefresh={revalidate}
              />
            }
          />
        )}
        {metrics.map((metric) => (
          <List.Item
            key={metric.title}
            title={metric.title}
            icon={Icon.BarChart}
            accessories={[{ text: metric.value }]}
            actions={
              <WebsiteActions
                website={website}
                copyTitle="Copy Value"
                copyValue={metric.value}
                onRefresh={revalidate}
              />
            }
          />
        ))}
      </List.Section>
      <BreakdownSection
        title="Top Pages"
        icon={Icon.Document}
        rows={data?.pages ?? []}
        website={website}
        onRefresh={revalidate}
      />
      <BreakdownSection
        title="Top Referrers"
        icon={Icon.Link}
        rows={data?.referrers ?? []}
        website={website}
        onRefresh={revalidate}
      />
      <BreakdownSection
        title="Top Countries"
        icon={Icon.Globe}
        rows={data?.countries ?? []}
        website={website}
        onRefresh={revalidate}
      />
    </List>
  );
}
