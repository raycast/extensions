import { useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ServiceContext } from "../cli";
import { MetricGQL, MetricMeasurement, MetricRange, fetchMetrics, metricRanges, serviceUrl } from "../railway";
import { ChartPoint, chartMarkdown, formatCpu, formatGb, formatPercent, utilizationColor } from "../utils";

interface MetricsViewProps {
  context: ServiceContext;
  serviceName: string;
}

interface MetricSummary {
  current: number;
  average: number;
  max: number;
  points: ChartPoint[];
}

const summarize = (metric: MetricGQL | undefined): MetricSummary | undefined => {
  if (!metric || metric.values.length === 0) return undefined;
  const points = [...metric.values].sort((a, b) => a.ts - b.ts);
  const values = points.map((p) => p.value);
  return {
    current: values[values.length - 1],
    average: values.reduce((sum, v) => sum + v, 0) / values.length,
    max: Math.max(...values),
    points,
  };
};

interface MetricRow {
  id: string;
  title: string;
  icon: Icon;
  color: string;
  usage: MetricMeasurement;
  limit?: MetricMeasurement;
  format: (value: number) => string;
  hideWhenZero?: boolean;
}

const rows: MetricRow[] = [
  {
    id: "cpu",
    title: "CPU",
    icon: Icon.ComputerChip,
    color: "#8B5CF6",
    usage: "CPU_USAGE",
    limit: "CPU_LIMIT",
    format: formatCpu,
  },
  {
    id: "memory",
    title: "Memory",
    icon: Icon.MemoryChip,
    color: "#3B82F6",
    usage: "MEMORY_USAGE_GB",
    limit: "MEMORY_LIMIT_GB",
    format: formatGb,
  },
  {
    id: "egress",
    title: "Network Egress",
    icon: Icon.Upload,
    color: "#10B981",
    usage: "NETWORK_TX_GB",
    format: formatGb,
  },
  {
    id: "ingress",
    title: "Network Ingress",
    icon: Icon.Download,
    color: "#F59E0B",
    usage: "NETWORK_RX_GB",
    format: formatGb,
  },
  {
    id: "disk",
    title: "Volume",
    icon: Icon.HardDrive,
    color: "#EC4899",
    usage: "DISK_USAGE_GB",
    format: formatGb,
    hideWhenZero: true,
  },
];

export function MetricsView({ context, serviceName }: MetricsViewProps) {
  const [range, setRange] = useState<MetricRange>("1h");
  const {
    isLoading,
    data: metrics = [],
    revalidate,
  } = useCachedPromise(fetchMetrics, [context.environmentId, context.serviceId, range]);

  const byMeasurement = new Map(metrics.map((m) => [m.measurement, m]));
  const visibleRows = rows
    .map((row) => ({
      row,
      usage: summarize(byMeasurement.get(row.usage)),
      // The limit is a flat line, so its latest value is the one that applies
      limit: row.limit ? summarize(byMeasurement.get(row.limit))?.current : undefined,
    }))
    // Disk usage is reported as zeros for services without a volume, so skip it there like the CLI does
    .filter(
      (r): r is typeof r & { usage: MetricSummary } => Boolean(r.usage) && !(r.row.hideWhenZero && !r.usage?.max),
    );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={visibleRows.length > 0}
      navigationTitle={`${serviceName} · Metrics`}
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={range} onChange={(value) => setRange(value as MetricRange)}>
          {(Object.keys(metricRanges) as MetricRange[]).map((r) => (
            <List.Dropdown.Item key={r} title={metricRanges[r].title} value={r} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && visibleRows.length === 0 && (
        <List.EmptyView
          icon={Icon.LineChart}
          title="No Metrics"
          description={`${serviceName} has no metrics for the ${metricRanges[range].title.toLowerCase()}`}
        />
      )}
      {visibleRows.map(({ row, usage, limit }) => {
        const utilization = limit ? (usage.current / limit) * 100 : undefined;
        const color = utilization !== undefined ? utilizationColor(utilization) : Color.SecondaryText;

        return (
          <List.Item
            key={row.id}
            icon={row.icon}
            title={row.title}
            accessories={[{ tag: { value: row.format(usage.current), color } }]}
            detail={
              <List.Item.Detail
                markdown={chartMarkdown(usage.points, row.color, row.format, limit)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Current" text={row.format(usage.current)} />
                    <List.Item.Detail.Metadata.Label title="Average" text={row.format(usage.average)} />
                    <List.Item.Detail.Metadata.Label title="Max" text={row.format(usage.max)} />
                    {limit !== undefined && <List.Item.Detail.Metadata.Label title="Limit" text={row.format(limit)} />}
                    {utilization !== undefined && (
                      <List.Item.Detail.Metadata.TagList title="Utilization">
                        <List.Item.Detail.Metadata.TagList.Item text={formatPercent(utilization)} color={color} />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Time Range" text={metricRanges[range].title} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Railway"
                  url={serviceUrl(context.projectId, context.serviceId, context.environmentId)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
