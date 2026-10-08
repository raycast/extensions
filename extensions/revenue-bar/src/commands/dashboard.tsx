import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { ConvertedTotal } from "../core/fx";
import { Money, formatMoney, formatMoneyList } from "../core/money";
import { RANGE_IDS, RANGE_TITLES, RangeId, parseRangeId } from "../core/ranges";
import { SummariesData, useSummaries } from "../hooks/data";
import { defaultRangeId, displayCurrency, selectedRange, storeSelectedRange } from "../hooks/runtime";
import { useProviders } from "../hooks/useProviders";
import { LockedProviderSection } from "../license/gate";
import { DASHBOARD_URLS, PROVIDER_LABELS, Summary } from "../providers/types";
import { CommonActions, NoProvidersEmptyView, ProviderErrorItem, providerIcon } from "../ui/components";
import { pluralize, sectionTitle, updatedLabel } from "../ui/format";
import { SHORTCUTS } from "../ui/shortcuts";
import { SummaryDetail } from "../ui/SummaryDetail";

function headline(amounts: Money[], converted?: ConvertedTotal): string {
  if (converted) {
    return [formatMoney(converted.total, "kpi"), ...converted.unconverted.map((m) => formatMoney(m, "kpi"))].join(
      " + ",
    );
  }
  return formatMoneyList(amounts, "kpi");
}

/** KPI row in the chartmogul/datafast style: label as title, value as a PrimaryText accessory. */
function KpiItem(props: {
  title: string;
  value: string;
  icon: Image.ImageLike;
  data: SummariesData;
  onRefresh: () => void;
  tooltip?: string;
}) {
  const { data } = props;
  return (
    <List.Item
      icon={props.icon}
      title={props.title}
      accessories={[{ text: { value: props.value, color: Color.PrimaryText }, tooltip: props.tooltip }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={
              <SummaryDetail
                title={`All Providers · ${data.range.label}`}
                range={data.range}
                gross={data.combined.gross}
                net={data.combined.net}
                refunds={data.combined.refunds}
                count={data.combined.count}
                partial={data.combined.partial}
                fetchedAt={data.fetchedAt}
                converted={data.combined.converted}
                fxError={data.fxError}
                onRefresh={props.onRefresh}
              />
            }
          />
          <Action.CopyToClipboard title={`Copy ${props.title}`} content={props.value} />
          <CommonActions onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function ProviderItem(props: { summary: Summary; onRefresh: () => void }) {
  const { summary } = props;
  const label = PROVIDER_LABELS[summary.provider];
  const accessories: List.Item.Accessory[] = [];
  if (summary.partial) {
    accessories.push({
      icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
      tooltip: "More sales than one refresh reads. Totals may be low.",
    });
  }
  accessories.push({ text: { value: formatMoneyList(summary.gross, "kpi"), color: Color.PrimaryText } });
  return (
    <List.Item
      icon={providerIcon(summary.provider)}
      title={label}
      subtitle={pluralize(summary.count, "sale")}
      keywords={[summary.provider]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={
              <SummaryDetail
                title={`${label} · ${summary.range.label}`}
                range={summary.range}
                gross={summary.gross}
                net={summary.net}
                fees={summary.fees}
                refunds={summary.refunds}
                count={summary.count}
                partial={summary.partial}
                fetchedAt={summary.fetchedAt}
                dashboardUrl={DASHBOARD_URLS[summary.provider]}
                dashboardTitle={`${label} Dashboard`}
                onRefresh={props.onRefresh}
              />
            }
          />
          <Action.OpenInBrowser
            title={`Open ${label} Dashboard`}
            url={DASHBOARD_URLS[summary.provider]}
            icon={Icon.Globe}
            shortcut={SHORTCUTS.openDashboard}
          />
          <Action.CopyToClipboard
            title="Copy Gross"
            content={formatMoneyList(summary.gross)}
            shortcut={SHORTCUTS.copyAmount}
          />
          <CommonActions onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function RangeDropdown(props: { defaultValue: RangeId; onChange: (id: RangeId) => void }) {
  return (
    <List.Dropdown
      tooltip="Time Range"
      storeValue
      defaultValue={props.defaultValue}
      onChange={(value) => props.onChange(parseRangeId(value, props.defaultValue))}
    >
      {RANGE_IDS.map((id) => (
        <List.Dropdown.Item key={id} title={RANGE_TITLES[id]} value={id} />
      ))}
    </List.Dropdown>
  );
}

export default function Dashboard() {
  const providers = useProviders();
  const fallbackRange = defaultRangeId(providers.prefs);
  const [rangeId, setRangeId] = useState<RangeId>(() => selectedRange(fallbackRange));
  const currency = displayCurrency(providers.prefs);
  const { data, isLoading, revalidate } = useSummaries(rangeId, providers.activeIds, currency, !providers.isLoading);

  const onRangeChange = (id: RangeId) => {
    setRangeId(id);
    storeSelectedRange(id);
  };

  const summaries = (data?.results ?? []).flatMap((r) => (r.ok ? [r.data] : []));
  const failed = (data?.results ?? []).filter((r) => !r.ok);
  const converted = data?.combined.converted;

  return (
    <List
      isLoading={isLoading || providers.isLoading}
      navigationTitle="Revenue Dashboard"
      searchBarPlaceholder="Filter providers"
      searchBarAccessory={<RangeDropdown defaultValue={fallbackRange} onChange={onRangeChange} />}
    >
      {providers.configured.length === 0 ? <NoProvidersEmptyView /> : null}
      {data && summaries.length > 0 ? (
        <List.Section title={`All Providers · ${data.range.label}`} subtitle={updatedLabel(data.fetchedAt)}>
          <KpiItem
            title="Gross Revenue"
            icon={{ source: Icon.BankNote, tintColor: Color.Green }}
            value={headline(data.combined.gross, converted?.gross)}
            tooltip={data.fxError ? `Exchange rates unavailable: ${data.fxError}` : undefined}
            data={data}
            onRefresh={revalidate}
          />
          {data.combined.net ? (
            <KpiItem
              title="Net Revenue"
              icon={{ source: Icon.Coins, tintColor: Color.Green }}
              value={headline(data.combined.net, converted?.net)}
              tooltip="After provider fees"
              data={data}
              onRefresh={revalidate}
            />
          ) : null}
          <KpiItem
            title="Refunds"
            icon={{ source: Icon.ArrowUp, tintColor: Color.Red }}
            value={headline(data.combined.refunds, converted?.refunds)}
            data={data}
            onRefresh={revalidate}
          />
          <KpiItem
            title="Sales"
            icon={{ source: Icon.Receipt, tintColor: Color.Blue }}
            value={String(data.combined.count)}
            data={data}
            onRefresh={revalidate}
          />
        </List.Section>
      ) : null}
      {data && (summaries.length > 0 || failed.length > 0) ? (
        <List.Section title={sectionTitle("By Provider", data.results.length)}>
          {data.results.map((result) =>
            result.ok ? (
              <ProviderItem key={result.provider} summary={result.data} onRefresh={revalidate} />
            ) : (
              <ProviderErrorItem
                key={result.provider}
                provider={result.provider}
                error={result.error}
                onRetry={revalidate}
              />
            ),
          )}
        </List.Section>
      ) : null}
      <LockedProviderSection locked={providers.locked} />
    </List>
  );
}
