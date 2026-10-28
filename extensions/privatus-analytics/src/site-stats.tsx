import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { ReactNode } from "react";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { dashboardUrl, Metrics, Overview, PanelRow, SiteWithStats, trackingSnippet } from "./api";
import {
  changeIsGood,
  countryFlag,
  countryName,
  formatChange,
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
  isPeriod,
  Period,
  PERIODS,
  referrerLabel,
} from "./format";
import { getClient } from "./preferences";

type MetricRow = { key: keyof Metrics; title: string; icon: Icon; format: (n?: number) => string };

const METRICS: MetricRow[] = [
  { key: "visitors", title: "Visitors", icon: Icon.TwoPeople, format: formatNumber },
  { key: "visits", title: "Visits", icon: Icon.Footprints, format: formatNumber },
  { key: "pageviews", title: "Pageviews", icon: Icon.Eye, format: formatNumber },
  { key: "views_per_visit", title: "Views per Visit", icon: Icon.Layers, format: (n) => (n ?? 0).toFixed(2) },
  { key: "bounce_rate", title: "Bounce Rate", icon: Icon.ArrowNe, format: formatPercent },
  { key: "visit_duration", title: "Visit Duration", icon: Icon.Clock, format: formatDuration },
  { key: "revenue", title: "Revenue", icon: Icon.Coins, format: formatMoney },
];

export default function SiteStats({ site }: { site: SiteWithStats }) {
  const [period, setPeriod] = useCachedState<Period>("period", "7d");
  const { data, isLoading, revalidate } = useCachedPromise(
    async (siteId: string, p: string) => getClient().overview(siteId, p),
    [site.id, period],
    {
      onError: (e) => {
        showFailureToast(e, { title: "Could not load stats" });
      },
    },
  );

  const periodTitle = PERIODS.find((p) => p.value === period)?.title ?? period;
  const shared = (
    <>
      <Action.OpenInBrowser title="Open in Privatus Analytics" url={dashboardUrl(site.id)} />
      <Action.CopyToClipboard title="Copy Site ID" content={site.id} shortcut={Keyboard.Shortcut.Common.CopyName} />
      <Action.CopyToClipboard
        title="Copy Tracking Code"
        content={trackingSnippet(site.id)}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={site.name || site.domain}
      searchBarPlaceholder={`Filter ${site.domain}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Date Range" value={period} onChange={(v) => isPeriod(v) && setPeriod(v)}>
          {PERIODS.map((p) => (
            <List.Dropdown.Item key={p.value} value={p.value} title={p.title} />
          ))}
        </List.Dropdown>
      }
    >
      {data && <MetricsSection data={data} periodTitle={periodTitle} actions={shared} />}
      {data && (
        <PanelSection
          title="Top Pages"
          rows={data.panels?.page}
          icon={Icon.Document}
          label={(r) => r.value}
          count={(r) => r.pageviews}
          unit="pageviews"
          actions={shared}
          url={(r) => `https://${site.domain}${r.value.startsWith("/") && !r.value.includes(":") ? r.value : ""}`}
        />
      )}
      {data && (
        <PanelSection
          title="Top Referrers"
          rows={data.panels?.referrer}
          icon={Icon.Link}
          label={(r) => referrerLabel(r.value)}
          count={(r) => r.visitors}
          unit="visitors"
          actions={shared}
        />
      )}
      {data && (
        <PanelSection
          title="Top Countries"
          rows={data.panels?.country}
          label={(r) => `${countryFlag(r.value)}  ${countryName(r.value)}`}
          count={(r) => r.visitors}
          unit="visitors"
          actions={shared}
        />
      )}
    </List>
  );
}

function MetricsSection({ data, periodTitle, actions }: { data: Overview; periodTitle: string; actions: ReactNode }) {
  return (
    <List.Section title={periodTitle} subtitle="Compared with the period before">
      {data.live_visitors !== undefined && (
        <List.Item
          title="Live Visitors"
          icon={{ source: Icon.CircleFilled, tintColor: data.live_visitors > 0 ? Color.Green : Color.SecondaryText }}
          accessories={[{ text: formatNumber(data.live_visitors), tooltip: "Visitors in the last 5 minutes" }]}
          actions={<ActionPanel>{actions}</ActionPanel>}
        />
      )}
      {METRICS.filter((m) => data.metrics[m.key] !== undefined).map((m) => {
        const change = data.change?.[m.key];
        const changeText = formatChange(change);
        const accessories: List.Item.Accessory[] = [];
        if (changeText && change !== null && change !== undefined) {
          accessories.push({
            tag: { value: changeText, color: changeIsGood(m.key, change) ? Color.Green : Color.Red },
          });
        }
        accessories.push({ text: m.format(data.metrics[m.key]) });
        return (
          <List.Item
            key={m.key}
            title={m.title}
            icon={m.icon}
            accessories={accessories}
            actions={
              <ActionPanel>
                {actions}
                <Action.CopyToClipboard title="Copy Value" content={m.format(data.metrics[m.key])} />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

function PanelSection(props: {
  title: string;
  rows?: PanelRow[];
  icon?: Icon;
  label: (r: PanelRow) => string;
  count: (r: PanelRow) => number | undefined;
  unit: string;
  actions: ReactNode;
  url?: (r: PanelRow) => string;
}) {
  const rows = props.rows ?? [];
  if (rows.length === 0) return null;
  return (
    <List.Section title={props.title}>
      {rows.map((r, i) => (
        <List.Item
          key={`${props.title}-${r.value}-${i}`}
          title={props.label(r)}
          icon={props.icon}
          accessories={[
            { text: formatPercent(r.share), tooltip: "Share of the total" },
            { text: `${formatNumber(props.count(r))} ${props.unit}` },
          ]}
          actions={
            <ActionPanel>
              {props.url && <Action.OpenInBrowser title="Open Page" url={props.url(r)} />}
              {props.actions}
              <Action.CopyToClipboard title="Copy Name" content={r.value} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
