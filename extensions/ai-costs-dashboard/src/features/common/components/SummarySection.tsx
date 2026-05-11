import { Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { renderTotalsDetail } from "../lib/dashboardDetail/dashboardDetail";
import { formatCurrency } from "../lib/formatUsageValue/formatUsageValue";
import type { SummaryMetric } from "../lib/dashboardState/dashboardState";

const metricIcon = {
  today: { source: Icon.Calendar, tintColor: Color.Blue },
  monthToDate: { source: Icon.BarChart, tintColor: Color.Purple },
  total: { source: Icon.Coins, tintColor: Color.Green },
} satisfies Record<SummaryMetric["id"], { source: Icon; tintColor: Color }>;

type SummarySectionProps = {
  actions: ReactNode;
  metrics: SummaryMetric[];
};

export const SummarySection = ({ actions, metrics }: SummarySectionProps) => (
  <List.Section title="Summary">
    {metrics.map((metric) => (
      <List.Item
        key={metric.id}
        id={metric.id}
        title={metric.title}
        icon={metricIcon[metric.id]}
        accessories={[
          { text: formatCurrency(metric.totals.costUSD), tooltip: "Cost" },
        ]}
        detail={
          <List.Item.Detail
            markdown={renderTotalsDetail(metric.title, metric.totals)}
          />
        }
        actions={actions}
      />
    ))}
  </List.Section>
);
