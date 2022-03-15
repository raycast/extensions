import { DashboardSummaryDefinition } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/DashboardSummaryDefinition";
import { dashboardsApi } from "./datadog-api";
import { useLocalState } from "./cache";

type State = {
  dashboards: DashboardSummaryDefinition[];
};

export const useDashboards = () => {
  const loader = () => {
    return dashboardsApi
      .listDashboards()
      .then(summary => summary.dashboards || [])
      .then(data => ({ dashboards: data } as State));
  };

  const {state, loading: dashboardsAreLoading} = useLocalState<State>("dashboards", { dashboards: [] }, loader);

  return { state, dashboardsAreLoading };
};
