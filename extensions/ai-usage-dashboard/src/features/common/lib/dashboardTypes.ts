import type { UsageSummary } from "./usageSummary/usageSummary";

export type UsageDashboardData = {
  rawJson: string;
  summary: UsageSummary;
};

export type DashboardDataError = Error & {
  markdown: string;
  rawJson?: string;
};
