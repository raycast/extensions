import { Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { renderDayDetail } from "../lib/dashboardDetail/dashboardDetail";
import {
  formatCurrency,
  formatDate,
} from "../lib/formatUsageValue/formatUsageValue";
import type { DailyUsage } from "../lib/usageSummary/usageSummary";

type RecentDaysSectionProps = {
  actions: ReactNode;
  days: DailyUsage[];
};

export const RecentDaysSection = ({
  actions,
  days,
}: RecentDaysSectionProps) => (
  <List.Section title="Recent Days">
    {days.map((day) => (
      <List.Item
        key={day.date}
        id={`day-${day.date}`}
        title={formatDate(day.date)}
        icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
        accessories={[{ text: formatCurrency(day.costUSD), tooltip: "Cost" }]}
        detail={<List.Item.Detail markdown={renderDayDetail(day)} />}
        actions={actions}
      />
    ))}
  </List.Section>
);
