import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getBreakdown, getDateRange, getMetadata, getOverview, getPreferences, getRealtime } from "./datafast";
import { formatCurrency, formatDuration, formatNumber, formatPercent, truncate } from "./format";
import type { BreakdownKind, BreakdownRow, DateRangeKey, Metadata, Overview, Realtime } from "./types";

type DashboardState = {
  metadata?: Metadata;
  overview?: Overview;
  realtime?: Realtime;
  breakdowns: Record<BreakdownKind, BreakdownRow[]>;
};

const BREAKDOWNS: Array<{ kind: BreakdownKind; title: string }> = [
  { kind: "pages", title: "Top Pages" },
  { kind: "referrers", title: "Top Referrers" },
  { kind: "countries", title: "Top Countries" },
  { kind: "devices", title: "Devices" },
  { kind: "campaigns", title: "Campaigns" },
  { kind: "goals", title: "Custom Goals" },
];

export default function Command() {
  const preferences = getPreferences();
  const [range, setRange] = useState<DateRangeKey>(preferences.defaultDateRange);
  const [state, setState] = useState<DashboardState>({ breakdowns: createEmptyBreakdowns() });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [metadata, overview, realtime, ...breakdowns] = await Promise.all([
        getMetadata(),
        getOverview(range),
        getRealtime(),
        ...BREAKDOWNS.map((breakdown) => getBreakdown(breakdown.kind, range)),
      ]);

      setState({
        metadata,
        overview,
        realtime,
        breakdowns: BREAKDOWNS.reduce((accumulator, breakdown, index) => {
          accumulator[breakdown.kind] = breakdowns[index] ?? [];
          return accumulator;
        }, createEmptyBreakdowns()),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load DataFast analytics.";
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load DataFast", message });
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const currency = state.overview?.currency ?? state.metadata?.currency;
  const rangeLabel = useMemo(() => getDateRange(range).label, [range]);
  const dateRangeDropdown = (
    <List.Dropdown tooltip="Date Range" value={range} onChange={(value) => setRange(value as DateRangeKey)}>
      <List.Dropdown.Item title="Last 7 Days" value="7d" />
      <List.Dropdown.Item title="Last 30 Days" value="30d" />
      <List.Dropdown.Item title="Last 90 Days" value="90d" />
      <List.Dropdown.Item title="All Time" value="all" />
    </List.Dropdown>
  );

  if (error) {
    return (
      <List isLoading={isLoading} searchBarAccessory={dateRangeDropdown}>
        <List.EmptyView
          title="Could Not Load DataFast"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={load} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search dashboard rows..."
      searchBarAccessory={dateRangeDropdown}
    >
      <List.Section title="Overview" subtitle={rangeLabel}>
        <List.Item
          icon={{ source: Icon.BarChart, tintColor: Color.Orange }}
          title={state.metadata?.name || state.metadata?.domain || "DataFast"}
          subtitle={state.metadata?.domain || state.metadata?.timezone || undefined}
          accessories={[{ text: `${formatNumber(state.realtime?.visitors)} live` }]}
          detail={
            <List.Item.Detail
              markdown={overviewMarkdown({
                overview: state.overview,
                realtime: state.realtime,
                metadata: state.metadata,
                rangeLabel,
                currency,
              })}
            />
          }
          actions={<DashboardActions onRefresh={load} />}
        />
        {overviewMetricItems(state.overview, currency).map((item) => (
          <List.Item
            key={item.title}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            accessories={[{ text: item.value }]}
            detail={<List.Item.Detail markdown={`# ${item.title}\n\n${item.value}\n\n${item.description}`} />}
            actions={<DashboardActions onRefresh={load} copyContent={`${item.title}: ${item.value}`} />}
          />
        ))}
      </List.Section>

      {BREAKDOWNS.map(({ kind, title }) => (
        <List.Section key={kind} title={title}>
          {state.breakdowns[kind].slice(0, 8).map((row, index) => (
            <List.Item
              key={`${kind}-${index}-${getBreakdownTitle(kind, row)}`}
              icon={getBreakdownIcon(kind)}
              title={getBreakdownTitle(kind, row)}
              subtitle={getBreakdownSubtitle(kind, row)}
              accessories={[
                { text: `${formatNumber(row.visitors ?? row.completions)} ${kind === "goals" ? "done" : "visitors"}` },
                ...(row.revenue !== undefined ? [{ text: formatCurrency(row.revenue, currency) }] : []),
              ]}
              detail={<List.Item.Detail markdown={breakdownMarkdown(kind, title, row, currency)} />}
              actions={<DashboardActions onRefresh={load} copyContent={JSON.stringify(row, null, 2)} />}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function DashboardActions(props: { onRefresh: () => void; copyContent?: string }) {
  return (
    <ActionPanel>
      <Action title="Refresh" onAction={props.onRefresh} />
      <Action.OpenInBrowser title="Open Datafast Dashboard" url="https://datafa.st/dashboard" />
      {props.copyContent ? <Action.CopyToClipboard title="Copy Row" content={props.copyContent} /> : null}
      <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

function createEmptyBreakdowns(): Record<BreakdownKind, BreakdownRow[]> {
  return {
    pages: [],
    referrers: [],
    countries: [],
    devices: [],
    campaigns: [],
    goals: [],
  };
}

function overviewMetricItems(overview: Overview | undefined, currency: string | null | undefined) {
  return [
    {
      title: "Visitors",
      value: formatNumber(overview?.visitors),
      subtitle: `${formatNumber(overview?.sessions)} sessions`,
      description: "Unique visitors in the selected reporting window.",
      icon: { source: Icon.Person, tintColor: Color.Blue },
    },
    {
      title: "Revenue",
      value: formatCurrency(overview?.revenue, currency),
      subtitle: `${formatNumber(overview?.payments)} payments`,
      description: "Total attributed revenue for the selected reporting window.",
      icon: { source: Icon.Coin, tintColor: Color.Yellow },
    },
    {
      title: "Conversion Rate",
      value: formatPercent(overview?.conversion_rate),
      subtitle: `${formatCurrency(overview?.revenue_per_visitor, currency)} per visitor`,
      description: "Revenue-based conversion rate for this period.",
      icon: { source: Icon.Checkmark, tintColor: Color.Green },
    },
    {
      title: "Engagement",
      value: formatPercent(overview?.bounce_rate),
      subtitle: `${formatDuration(overview?.avg_session_duration)} average session`,
      description: "Bounce rate and average session duration.",
      icon: { source: Icon.Clock, tintColor: Color.Purple },
    },
  ];
}

function overviewMarkdown(props: {
  overview?: Overview;
  realtime?: Realtime;
  metadata?: Metadata;
  rangeLabel: string;
  currency?: string | null;
}): string {
  return [
    `# ${props.metadata?.name || props.metadata?.domain || "DataFast"}`,
    "",
    `**Range:** ${props.rangeLabel}`,
    props.metadata?.timezone ? `**Timezone:** ${props.metadata.timezone}` : undefined,
    props.currency ? `**Currency:** ${props.currency}` : undefined,
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Live visitors | ${formatNumber(props.realtime?.visitors)} |`,
    `| Visitors | ${formatNumber(props.overview?.visitors)} |`,
    `| Sessions | ${formatNumber(props.overview?.sessions)} |`,
    `| Revenue | ${formatCurrency(props.overview?.revenue, props.currency)} |`,
    `| Payments | ${formatNumber(props.overview?.payments)} |`,
    `| Revenue per visitor | ${formatCurrency(props.overview?.revenue_per_visitor, props.currency)} |`,
    `| Conversion rate | ${formatPercent(props.overview?.conversion_rate)} |`,
    `| Bounce rate | ${formatPercent(props.overview?.bounce_rate)} |`,
    `| Avg session | ${formatDuration(props.overview?.avg_session_duration)} |`,
  ]
    .filter(Boolean)
    .join("\n");
}

function getBreakdownTitle(kind: BreakdownKind, row: BreakdownRow): string {
  if (kind === "pages") {
    return `${row.hostname ? `${row.hostname}` : ""}${row.path || "/"}`;
  }

  if (kind === "campaigns") {
    return (
      row.campaign?.utm_campaign ||
      row.campaign?.utm_source ||
      row.campaign?.ref ||
      row.campaign?.source ||
      row.campaign?.via ||
      "Unknown campaign"
    );
  }

  return row.referrer || row.country || row.device || row.goal || "Unknown";
}

function getBreakdownSubtitle(kind: BreakdownKind, row: BreakdownRow): string | undefined {
  if (kind === "pages") {
    return row.path && row.hostname ? row.path : undefined;
  }

  if (kind === "campaigns") {
    return [row.campaign?.utm_source, row.campaign?.utm_medium, row.campaign?.ref, row.campaign?.via]
      .filter(Boolean)
      .join(" / ");
  }

  return undefined;
}

function getBreakdownIcon(kind: BreakdownKind) {
  const iconMap: Record<BreakdownKind, Icon> = {
    pages: Icon.Document,
    referrers: Icon.Link,
    countries: Icon.Globe,
    devices: Icon.Desktop,
    campaigns: Icon.Megaphone,
    goals: Icon.BullsEye,
  };

  return iconMap[kind];
}

function breakdownMarkdown(
  kind: BreakdownKind,
  sectionTitle: string,
  row: BreakdownRow,
  currency?: string | null,
): string {
  return [
    `# ${sectionTitle}`,
    "",
    `## ${getBreakdownTitle(kind, row)}`,
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Visitors | ${formatNumber(row.visitors)} |`,
    row.completions !== undefined ? `| Completions | ${formatNumber(row.completions)} |` : undefined,
    row.revenue !== undefined ? `| Revenue | ${formatCurrency(row.revenue, currency)} |` : undefined,
    row.payments !== undefined ? `| Payments | ${formatNumber(row.payments)} |` : undefined,
    "",
    kind === "campaigns" ? campaignMarkdown(row) : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function campaignMarkdown(row: BreakdownRow): string {
  const entries = Object.entries(row.campaign ?? {}).filter(([, value]) => value);
  if (entries.length === 0) {
    return "";
  }

  return ["## Campaign Fields", "", ...entries.map(([key, value]) => `- **${key}:** ${truncate(value, 120)}`)].join(
    "\n",
  );
}
