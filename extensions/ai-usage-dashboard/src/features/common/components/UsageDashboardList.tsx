import { List } from "@raycast/api";
import type { ReactNode } from "react";
import { RecentDaysSection } from "./RecentDaysSection";
import { SummarySection } from "./SummarySection";
import { createSummaryMetrics } from "../lib/dashboardState/dashboardState";
import type { UsageDashboardData } from "../lib/dashboardTypes";

type UsageDashboardListProps = {
  actions: ReactNode;
  children?: ReactNode;
  data?: UsageDashboardData;
  isLoading: boolean;
};

export const UsageDashboardList = ({
  actions,
  children,
  data,
  isLoading,
}: UsageDashboardListProps) => {
  const summaryMetrics = data ? createSummaryMetrics(data.summary) : [];
  const recentDays = data?.summary.recentDays ?? [];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search usage metrics..."
    >
      {children}
      <SummarySection actions={actions} metrics={summaryMetrics} />
      <RecentDaysSection actions={actions} days={recentDays} />
    </List>
  );
};
