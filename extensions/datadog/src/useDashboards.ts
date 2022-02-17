import { useEffect, useState } from "react";
import { DashboardSummaryDefinition } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/DashboardSummaryDefinition";
import { dashboardsApi } from "./datadog-api";
import { showError } from "./util";

type State = {
  dashboardsAreLoading: boolean;
  dashboards: DashboardSummaryDefinition[];
};

export const useDashboards = () => {
  const [{ dashboardsAreLoading, dashboards }, setState] = useState<State>({
    dashboards: [],
    dashboardsAreLoading: true,
  });

  useEffect(() => {
    dashboardsApi
      .listDashboards()
      .then(summary => summary.dashboards || [])
      .then(dashboards => setState(prev => ({ ...prev, dashboards })))
      .catch(showError)
      .finally(() => setState(prev => ({ ...prev, dashboardsAreLoading: false })));
  }, []);

  return { dashboards, dashboardsAreLoading };
};
