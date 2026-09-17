import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import { FxErrorActions } from "./components/fx-error-actions";
import {
  defaultWorkingDirectory,
  FxUsageResponse,
  FxUsageTotals,
  getFxPreferences,
  markdownEscape,
  runFxJson,
} from "./lib/fx";

type Period = "24h" | "7d" | "30d";

const PERIOD_LABELS: Record<Period, string> = {
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
};

function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value || 0);
}

function formatSpend(value?: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value && value < 1 ? 4 : 2,
  }).format(value || 0);
}

function coverageLabel(data: FxUsageResponse): string {
  if (data.coverage?.full_window) return "Full coverage";
  if (data.coverage?.status) return `${data.coverage.status[0].toUpperCase()}${data.coverage.status.slice(1)} coverage`;
  return "Coverage unknown";
}

function UsageActions({ data, revalidate }: { data: FxUsageResponse; revalidate: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh Usage"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action.CopyToClipboard title="Copy Usage JSON" content={JSON.stringify(data, null, 2)} />
      <Action.OpenInBrowser title="Open Fx Usage Documentation" url="https://fx.sh/docs/using-fx/usage-and-costs" />
    </ActionPanel>
  );
}

function OverviewDetail({ data, period }: { data: FxUsageResponse; period: Period }) {
  const totals = data.totals || {};
  const windowStart = data.window_start_ms ? new Date(data.window_start_ms).toLocaleString() : "Unknown";
  const snapshot = data.snapshot_time_ms ? new Date(data.snapshot_time_ms).toLocaleString() : "Unknown";
  return (
    <List.Item.Detail
      markdown={`# fx Usage · ${PERIOD_LABELS[period]}\n\n**${formatNumber(totals.total_tokens)} tokens** across **${formatNumber(totals.request_count)} requests**, with ${formatSpend(totals.spend)} in locally recorded spend.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Total Tokens"
            text={formatNumber(totals.total_tokens)}
            icon={Icon.Gauge}
          />
          <List.Item.Detail.Metadata.Label
            title="Requests"
            text={formatNumber(totals.request_count)}
            icon={Icon.Message}
          />
          <List.Item.Detail.Metadata.Label title="Spend" text={formatSpend(totals.spend)} icon={Icon.Wallet} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Data Quality">
            <List.Item.Detail.Metadata.TagList.Item
              text={coverageLabel(data)}
              color={data.coverage?.full_window ? Color.Green : Color.Orange}
            />
            {data.completeness ? (
              <List.Item.Detail.Metadata.TagList.Item
                text={data.completeness}
                color={data.completeness === "complete" ? Color.Green : Color.Orange}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Window Started" text={windowStart} />
          <List.Item.Detail.Metadata.Label title="Snapshot" text={snapshot} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function MetricDetail({ title, value, total }: { title: string; value?: number | null; total?: number }) {
  const percentage = total ? ((value || 0) / total) * 100 : 0;
  return (
    <List.Item.Detail
      markdown={`# ${markdownEscape(title)}\n\n${formatNumber(value)} tokens`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Tokens" text={formatNumber(value)} icon={Icon.Gauge} />
          <List.Item.Detail.Metadata.Label title="Share of Total" text={`${percentage.toFixed(1)}%`} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ModelDetail({ model, totals }: { model: string; totals: FxUsageTotals }) {
  return (
    <List.Item.Detail
      markdown={`# ${markdownEscape(model)}\n\nUsage recorded for this model in the selected period.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Total Tokens"
            text={formatNumber(totals.total_tokens)}
            icon={Icon.Gauge}
          />
          <List.Item.Detail.Metadata.Label title="Input" text={formatNumber(totals.input_tokens)} />
          <List.Item.Detail.Metadata.Label title="Output" text={formatNumber(totals.output_tokens)} />
          <List.Item.Detail.Metadata.Label
            title="Requests"
            text={formatNumber(totals.request_count)}
            icon={Icon.Message}
          />
          <List.Item.Detail.Metadata.Label title="Spend" text={formatSpend(totals.spend)} icon={Icon.Wallet} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [period, setPeriod] = useState<Period>("7d");
  const { fxPath, defaultWorkspace } = getFxPreferences();
  const { data, error, isLoading, revalidate } = usePromise(
    async (selectedPeriod: Period) =>
      runFxJson<FxUsageResponse>(fxPath, ["usage", "--json", "--period", selectedPeriod], {
        cwd: defaultWorkingDirectory(defaultWorkspace),
      }),
    [period],
    { failureToastOptions: { title: "Could Not Load fx Usage" } },
  );

  const totals = data?.totals || {};
  const tokenMetrics = [
    { title: "Input Tokens", value: totals.input_tokens, icon: Icon.ArrowDownCircle, color: Color.Blue },
    { title: "Output Tokens", value: totals.output_tokens, icon: Icon.ArrowUpCircle, color: Color.Purple },
    { title: "Cache Read Tokens", value: totals.cache_read_tokens, icon: Icon.MemoryChip, color: Color.Green },
    { title: "Cache Write Tokens", value: totals.cache_write_tokens, icon: Icon.HardDrive, color: Color.Orange },
    ...(totals.reasoning_tokens === null || totals.reasoning_tokens === undefined
      ? []
      : [{ title: "Reasoning Tokens", value: totals.reasoning_tokens, icon: Icon.LightBulb, color: Color.Yellow }]),
  ];
  const actions = data ? <UsageActions data={data} revalidate={revalidate} /> : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={Boolean(data)}
      searchBarPlaceholder="Search usage metrics or models…"
      searchBarAccessory={
        <List.Dropdown tooltip="Usage Period" value={period} onChange={(value) => setPeriod(value as Period)}>
          <List.Dropdown.Item title="Last 24 Hours" value="24h" />
          <List.Dropdown.Item title="Last 7 Days" value="7d" />
          <List.Dropdown.Item title="Last 30 Days" value="30d" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could Not Load fx Usage"
          description={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={<FxErrorActions error={error} retry={revalidate} />}
        />
      ) : data ? (
        <>
          <List.Section title={PERIOD_LABELS[period]}>
            <List.Item
              title={`${formatNumber(totals.total_tokens)} Tokens`}
              subtitle={`${formatNumber(totals.request_count)} requests · ${formatSpend(totals.spend)}`}
              icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
              accessories={[
                {
                  tag: {
                    value: coverageLabel(data),
                    color: data.coverage?.full_window ? Color.Green : Color.Orange,
                  },
                },
              ]}
              detail={<OverviewDetail data={data} period={period} />}
              actions={actions}
            />
          </List.Section>
          <List.Section title="Token Breakdown">
            {tokenMetrics.map((metric) => (
              <List.Item
                key={metric.title}
                title={metric.title}
                icon={{ source: metric.icon, tintColor: metric.color }}
                accessories={[{ text: formatNumber(metric.value) }]}
                detail={<MetricDetail title={metric.title} value={metric.value} total={totals.total_tokens} />}
                actions={actions}
              />
            ))}
          </List.Section>
          {data.models?.length ? (
            <List.Section title="By Model" subtitle={`${data.models.length}`}>
              {data.models.map((entry, index) => (
                <List.Item
                  key={`${entry.model || "model"}-${index}`}
                  title={entry.model || "Unknown Model"}
                  subtitle={`${formatNumber(entry.totals?.request_count)} requests`}
                  icon={{ source: Icon.Stars, tintColor: Color.Purple }}
                  accessories={[
                    { text: formatNumber(entry.totals?.total_tokens) },
                    { tag: formatSpend(entry.totals?.spend) },
                  ]}
                  detail={<ModelDetail model={entry.model || "Unknown Model"} totals={entry.totals || {}} />}
                  actions={actions}
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}
