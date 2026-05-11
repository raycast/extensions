import { renderInvalidJsonMarkdown } from "./dashboardMarkdown/dashboardMarkdown";
import type { DashboardDataError } from "./dashboardTypes";

export const createDashboardDataError = (
  error: unknown,
  rawJson: string,
  command?: string,
  toolName?: string,
): DashboardDataError => {
  const dashboardError = (
    error instanceof Error ? error : new Error("Unknown parser error")
  ) as DashboardDataError;
  dashboardError.markdown = renderInvalidJsonMarkdown(
    rawJson,
    dashboardError,
    command,
    toolName,
  );
  dashboardError.rawJson = rawJson;

  return dashboardError;
};
